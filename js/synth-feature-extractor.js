
function Synth (audioCtx, windowSize, waveformType, freq)
{
  initialiseMembers (this, windowSize, waveformType);
  initialiseAudioProcessingCallback (this);

  function initialiseMembers (synth, windowSize, waveformType)
  {
      synth.analyser         = audioCtx.createAnalyser();
      synth.analyser.fftSize = windowSize;
      synth.numBins          = synth.analyser.frequencyBinCount;
      synth.timeDomain       = new Uint8Array(synth.numBins);
      synth.timeDomainF      = new Float32Array(synth.numBins);
      synth.freqDomain       = new Uint8Array(synth.numBins);

      synth.analyser.getByteTimeDomainData  (synth.timeDomain);
      synth.analyser.getFloatTimeDomainData (synth.timeDomainF);
      synth.analyser.getByteFrequencyData   (synth.freqDomain);

      synth.audioProcessingNode = audioCtx.createScriptProcessor(windowSize);

      synth.filter   = audioCtx.createBiquadFilter();

      synth.waveform = waveformType;

      synth.centreFrequency = freq;
      synth.harmonicsMultiplier = 1.0;

      synth.filter.type = 'lowpass';
      synth.filter.frequency.value = 2000;

      //synth.osc                .connect (synth.filter);
      //synth.gainNode           .connect (synth.filter);
      synth.filter             .connect (synth.analyser);
      synth.analyser           .connect (synth.audioProcessingNode);
      synth.audioProcessingNode.connect (audioCtx.destination);

      // Features--------------------------------------------------------;
      synth.centroid = 0.0;
      synth.rms = 0.0;

      // Start/stop  Interaction
      synth.isPlaying = false;
      synth.time = 0.0;
      synth.attackTime = 0.02;
      synth.releaseTime = 1.6;
      synth.decayTime = 0.3;
      synth.sustainProportion = 0.8;
      synth.sustainTime = 0.3;
      synth.synthPitchOnRamp = 0.6;
      synth.trigger = function (velocity)
      {
        synth.releaseTime = velocity * 2.6 + 0.4;
        //synth.setFrequency (((position.x + 100.0) / 200.0) * 400.0 + 100.0);
        synth.time = 0.0;
        
        synth.isPlaying = true;

        var numOscs = 3;
        if (synth.harmonicsMultiplier === 0.0)
          numOscs = 1;
        for (var oscIndex = 0; oscIndex < numOscs; oscIndex++)
        {
          var osc = audioCtx.createOscillator();
          var gainNode = audioCtx.createGain();

          if (synth.waveform === 0)
            osc.type = 'sine';
          else if (synth.waveform === 1)
            osc.type = 'square';
          else if (synth.waveform === 2)
            osc.type = 'sawtooth';

          osc.frequency.value = synth.centreFrequency * (1.0 + oscIndex * synth.harmonicsMultiplier );
          osc.connect (gainNode);
          gainNode.connect(synth.filter);

          var t = audioCtx.currentTime;
          var g = gainNode.gain;

          osc.start();
          g.cancelScheduledValues(t);
          //exponentialRampToValueAtTime doesn't like 0s. It won't work if the previous value is <= 0, or if the target value is <= 0. 
          //Thus, we set the value to a small amount before, and fade the env to a small amount during release.
          var silence = 0.0000001;
          g.setValueAtTime(silence, t);
          var oscGain = 1.0;
          if (oscIndex > 0)
            oscGain = (1.0 - (oscIndex / numOscs)) * 0.5;
          g.exponentialRampToValueAtTime (velocity * oscGain, t + synth.attackTime);
          t = t + synth.attackTime;
          g.exponentialRampToValueAtTime ((velocity*synth.sustainProportion) * oscGain, t + synth.decayTime);
          t = t + synth.decayTime + synth.sustainTime;
          g.exponentialRampToValueAtTime (silence, t + synth.releaseTime);
          t = t + synth.releaseTime;
          osc.stop(t + 0.05);
        }
      }

      synth.release = function()
      {
        var now = audioCtx.currentTime;
        var g = synth.gainNode.gain;
        g.cancelScheduledValues        (now);
        //console.log("release v: " + now + synth.releaseTime);
        g.exponentialRampToValueAtTime (0.000001, now + synth.releaseTime);
        g.setValueAtTime               (0.0, now + synth.releaseTime + 0.001);
        synth.isPlaying = false;
      }

      synth.changeFrequency = function (amt)
      {
        var f = synth.osc.frequency;
        var fNow = f.value;
        var now = audioCtx.currentTime;
        f.cancelScheduledValues (now);
        f.linearRampToValueAtTime (fNow + amt, now + 0.9);
      }

      synth.setFrequency = function (newFreq)
      {
        var f = synth.osc.frequency;
        var fNow = f.value;
        var now = audioCtx.currentTime;
        f.cancelScheduledValues (now);
        f.linearRampToValueAtTime (newFreq, now + 0.9);
      }
  }

  // Audio callback -----------------------------------------------------------
  function initialiseAudioProcessingCallback (synth)
  {
    synth.audioProcessingNode.onaudioprocess = function(audioProcessingEvent) 
    {
      synth.analyser.getFloatTimeDomainData(synth.timeDomainF);
      synth.analyser.getByteFrequencyData(synth.freqDomain);
      getSpectralCentroid(synth);
      getRMS(synth);

      var inputBuffer = audioProcessingEvent.inputBuffer;
      var outputBuffer = audioProcessingEvent.outputBuffer;

      for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) 
      {
        var inputData = inputBuffer.getChannelData(channel);
        var outputData = outputBuffer.getChannelData(channel);
        for (var sample = 0; sample < inputBuffer.length; sample++) 
        {
          outputData[sample] = inputData[sample];       
        }
      }
    }
  }

  //-Spetral Analysis----------------------------------------------------------
  function getSpectralCentroid(synth)
  {
    var nyquist = audioCtx.sampleRate/2;
    var binFrequencyRange = nyquist / synth.numBins;
    var binFrequencyRangeHalfStep = binFrequencyRange / 2.0;
    var magnitudeSum = 0.0;
    var weightedMagnitudeSum = 0.0;
    var centreFrequency = 0.0;
    for(var i = 0; i < synth.numBins; i++) 
    {
      //centreFrequency = i * binFrequencyRange + binFrequencyRangeHalfStep;
      var magnitude = (synth.freqDomain[i]);// - analyser.minDecibels) * decibelRange;
      magnitudeSum = magnitudeSum + magnitude;
      weightedMagnitudeSum = weightedMagnitudeSum +/*centreFrequency*/ (i + 1.0) * magnitude;
    }
    var centroidBins = weightedMagnitudeSum / magnitudeSum;
    //Normalised
    synth.centroid = centroidBins / synth.numBins;
  }
  //---------------------------------------------------------------------------

  //-Time Domain Analysis------------------------------------------------------
  function getRMS(synth)
  {
    var ampSum = 0.0;
    for (var sample = 0; sample < synth.numBins; sample++)
    {
      var amp = synth.timeDomainF[sample];
      ampSum += Math.pow(amp, 2.0);
    }
    av = ampSum / synth.numBins;
    synth.rms = Math.sqrt(av);
  }
  //---------------------------------------------------------------------------



}

//sinOsc.start();
