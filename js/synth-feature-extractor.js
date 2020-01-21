var silence = 0.0001;

const EnvState =
{
    ATTACK: 'attack',
    SUSTAIN: 'sustain',
    RELEASE: 'release',
    COMPLETE: 'complete'
}

const EnvType =
{
    HOLD: 'hold',
    LOOPING: 'looping',
    ONE_SHOT: 'one_shot'
}

function Synth(audioCtx, windowSize, waveformType, freq)
{
    initialiseMembers(this, windowSize, waveformType);
    initialiseAudioProcessingCallback(this);

    function initialiseMembers(synth, windowSize, waveformType)
    {
        synth.analyser = audioCtx.createAnalyser();
        synth.analyser.fftSize = windowSize;
        synth.numBins = synth.analyser.frequencyBinCount;
        synth.timeDomain = new Uint8Array(synth.numBins);
        synth.timeDomainF = new Float32Array(synth.numBins);
        synth.freqDomain = new Uint8Array(synth.numBins);

        synth.analyser.getByteTimeDomainData(synth.timeDomain);
        synth.analyser.getFloatTimeDomainData(synth.timeDomainF);
        synth.analyser.getByteFrequencyData(synth.freqDomain);

        synth.audioProcessingNode = audioCtx.createScriptProcessor(windowSize);

        synth.filter = audioCtx.createBiquadFilter();
        synth.filter.type = 'lowpass';
        synth.filter.frequency.value = 2000;

        synth.filter.connect(synth.analyser);
        synth.analyser.connect(synth.audioProcessingNode);
        synth.audioProcessingNode.connect(audioCtx.destination);

        // Params----------------------------------------------------------;
        synth.envType = EnvType.HOLD;
        synth.envState = EnvState.ATTACK;
        synth.waveform = waveformType;
        synth.centreFrequency = freq;
        synth.harmonicsMultiplier = 1.0;
        synth.numOscs = 3;
        synth.oscs = [];
        synth.gainNodes = [];
        synth.oscGains = [];
        synth.velocity = 0.0;
        // Features--------------------------------------------------------;
        synth.centroid = 0.0;
        synth.rms = 0.0;

        // Start/stop  Interaction-----------------------------------------;
        synth.attackTime = 0.02;
        synth.releaseTime = 1.6;
        synth.decayTime = 0.3;
        synth.sustainProportion = 0.8;
        synth.sustainTime = 0.3;
        synth.synthPitchOnRamp = 0.6;
        synth.lastTriggerTime = 0.0;
        synth.shouldRelease = false;
        synth.shouldLoop = true;

        for (var oscIndex = 0; oscIndex < synth.numOscs; oscIndex++)
        {
            synth.oscs.push(audioCtx.createOscillator());
            synth.gainNodes.push(audioCtx.createGain());
            synth.oscGains.push(1.0);

            var osc = synth.oscs[oscIndex];
            var gainNode = synth.gainNodes[oscIndex];

            if (synth.waveform === 0)
                osc.type = 'sine';
            else if (synth.waveform === 1)
                osc.type = 'square';
            else if (synth.waveform === 2)
                osc.type = 'sawtooth';

            osc.frequency.value = synth.centreFrequency * (1.0 + oscIndex * synth.harmonicsMultiplier);
            osc.connect(gainNode);
            gainNode.connect(synth.filter);
            gainNode.gain.setValueAtTime(0.0, audioCtx.currentTime);
            osc.start();
        }

        synth.reset = function(time_now)
        {
            synth.shouldRelease = false;
            synth.shouldLoop = true;
            synth.stopOscs();
        }

        synth.trigger = function (velocity)
        {
            console.log('freq: ' + synth.centreFrequency + ' h: ' + synth.harmonicsMultiplier);
            synth.reset(t);
            synth.lastTriggerTime = audioCtx.currentTime;
            if (velocity > 0)
            {
                synth.velocity = velocity;
                synth.releaseTime = velocity * 2.6 + 0.4;
                synth.envState = EnvState.ATTACK;
                for (var oscIndex = 0; oscIndex < synth.numOscs; oscIndex++)
                {
                    var gainNode = synth.gainNodes[oscIndex];

                    if (gainNode != null)
                    {
                        var g = gainNode.gain;
                        var t = audioCtx.currentTime;
                        g.cancelScheduledValues(t);
                        //exponentialRampToValueAtTime doesn't like 0s. It won't work if the previous value is <= 0, or if the target value is <= 0.
                        //Thus, we set the value to a small amount before, and fade the env to a small amount during release.
                        g.setValueAtTime(silence, t);
                        synth.oscGains[oscIndex] = 1.0;
                        if (oscIndex > 0)
                        {
                            if (synth.harmonicsMultiplier === 0.0)
                                synth.oscGains[oscIndex] = 0.0;
                            else
                                synth.oscGains[oscIndex] = (1.0 - (oscIndex / synth.numOscs)) * 0.5;
                        }
                        g.exponentialRampToValueAtTime(velocity * synth.oscGains[oscIndex], t + synth.attackTime);
                        t = t + synth.attackTime;
                        g.exponentialRampToValueAtTime((velocity * synth.sustainProportion) * synth.oscGains[oscIndex], t + synth.decayTime);
                    }
                }
            }
        }

        synth.noteOff = function()
        {
            if (synth.envType === EnvType.HOLD)
                synth.shouldRelease = true;
            else if (synth.envType === EnvType.LOOPING)
                synth.shouldLoop = false;
        }
        synth.triggerReleasePortion = function ()
        {
            synth.envState = EnvState.RELEASE;

            var now = audioCtx.currentTime;
            for (let oscIndex = 0; oscIndex < synth.numOscs; ++oscIndex)
            {
                if (synth.gainNodes[oscIndex] != null)
                {
                    var g = synth.gainNodes[oscIndex].gain;
                    // Need to explicitly set the control value first before calling exponentiaRampTo ...
                    // ( http://alemangui.github.io/blog//2015/12/26/ramp-to-value.html )
                    g.setValueAtTime(g.value, now);
                    g.exponentialRampToValueAtTime(silence, now + synth.releaseTime);
                }
            }
            synth.shouldRelease = false;
        }
        synth.stopOscs = function()
        {
            var now = audioCtx.currentTime;
            for (let oscIndex = 0; oscIndex < synth.numOscs; ++oscIndex)
            {
                if (synth.gainNodes[oscIndex] != null)
                    synth.gainNodes[oscIndex].gain.setValueAtTime(0.0, now);
            }
        }
        synth.getAttackDecayTime = function()
        {
            return synth.attackTime + synth.decayTime;
        }
        synth.getTotalEnvTime = function ()
        {
            return synth.attackTime + synth.decayTime + synth.sustainTime + synth.releaseTime;
        }
        synth.getCurrentEnvTime = function ()
        {
            if (audioCtx.currentTime > synth.lastTriggerTime + synth.getTotalEnvTime())
                return 0.0;
            //console.log('current: ' + audioCtx.currentTime + ' end: ' + (synth.lastTriggerTime + synth.getTotalEnvTime()));
            return (audioCtx.currentTime - synth.lastTriggerTime) / (synth.lastTriggerTime + synth.getTotalEnvTime());
        }
        synth.sustainReached = function()
        {
            return audioCtx.currentTime > synth.lastTriggerTime + synth.getAttackDecayTime();
        }
        synth.envComplete = function()
        {
            return audioCtx.currentTime > synth.lastTriggerTime + synth.getTotalEnvTime();
        }

        synth.changeFrequency = function (amt)
        {
            var f = synth.osc.frequency;
            var fNow = f.value;
            var now = audioCtx.currentTime;
            f.cancelScheduledValues(now);
            f.linearRampToValueAtTime(fNow + amt, now + 0.9);
        }

        synth.setCentreFrequency = function (newFreq)
        {
            synth.centreFrequency = newFreq;
            for (var oscIndex = 0; oscIndex < synth.numOscs; oscIndex++)
            {
                var osc = synth.oscs[oscIndex];
                if (osc != null)
                {
                    var f = osc.frequency;
                    var now = audioCtx.currentTime;
                    f.cancelScheduledValues(now);
                    f.setValueAtTime(f.value, now);
                    f.linearRampToValueAtTime(synth.centreFrequency * (1.0 + oscIndex * synth.harmonicsMultiplier), now + 0.1);
                }
            }
        }
    }

    // Audio callback -----------------------------------------------------------
    function initialiseAudioProcessingCallback(synth)
    {
        synth.audioProcessingNode.onaudioprocess = function (audioProcessingEvent)
        {
            if (synth.envState === EnvState.ATTACK && synth.sustainReached())
            {
                synth.envState = EnvState.SUSTAIN;
                if (synth.envType === EnvType.LOOPING || synth.envType === EnvType.ONE_SHOT)
                    synth.shouldRelease = true;
            }
            if (synth.envState === EnvState.SUSTAIN)
            {
                if (synth.shouldRelease)
                    synth.triggerReleasePortion();
            }
            if (synth.envState === EnvState.RELEASE)
            {
                if (synth.envComplete())
                    synth.envState = EnvState.COMPLETE;
            }
            if (synth.envState === EnvState.COMPLETE)
            {
                if (synth.envType === EnvType.LOOPING && synth.shouldLoop)
                    synth.trigger(synth.velocity);
                else
                    synth.stopOscs();
            }

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
        var nyquist = audioCtx.sampleRate / 2;
        var binFrequencyRange = nyquist / synth.numBins;
        var binFrequencyRangeHalfStep = binFrequencyRange / 2.0;
        var magnitudeSum = 0.0;
        var weightedMagnitudeSum = 0.0;
        var centreFrequency = 0.0;
        for (var i = 0; i < synth.numBins; i++)
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
