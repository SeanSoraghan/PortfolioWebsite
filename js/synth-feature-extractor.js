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
    ONE_SHOT: 'one_shot',
    INFINITE: 'infinite'
}

function Synth(audioCtx, windowSize, waveformType, freq)
{
    initialiseMembers(this, windowSize, waveformType);

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

        synth.filter = audioCtx.createBiquadFilter();
        synth.filter.type = 'lowpass';
        synth.filter.frequency.value = 2000;

        synth.filter.connect(synth.analyser);
        synth.analyser.connect(audioCtx.destination);

        // Params----------------------------------------------------------;
        synth.envType = EnvType.HOLD;
        synth.envState = EnvState.ATTACK;
        synth.waveform = waveformType;
        synth.centreFrequency = freq;
        synth.harmonicsMultiplier = 1.0;
        synth.numOscs = 3;
        synth.oscs = [];
        synth.oscGainNodes = [];
        synth.envGainNodes = [];
        synth.velocity = 0.0;
        // Features--------------------------------------------------------;
        synth.centroid = 0.0;
        synth.rms = 0.0;

        // Start/stop  Interaction-----------------------------------------;
        synth.isPlaying = false;
        synth.attackTime = 0.02;
        synth.releaseTime = 0.1;
        synth.decayTime = 0.1;
        synth.sustainProportion = 0.8;
        synth.sustainTime = 0.1;
        synth.synthPitchOnRamp = 0.6;
        synth.lastTriggerTime = 0.0;
        synth.releaseTriggerTime = 0.0;
        synth.shouldRelease = false;
        synth.shouldLoop = true;

        synth.killOscs = function()
        {
            for (var oscIndex = 0; oscIndex < synth.numOscs; oscIndex++)
            {
                var osc = synth.oscs[oscIndex];
                osc.stop();
            }
        }
        synth.initialiseOscs = function()
        {
            synth.oscs = [];
            synth.oscGainNodes = [];
            synth.envGainNodes = [];
            for (var oscIndex = 0; oscIndex < synth.numOscs; oscIndex++)
            {
                synth.oscs.push(audioCtx.createOscillator());
                synth.oscGainNodes.push(audioCtx.createGain());
                synth.envGainNodes.push(audioCtx.createGain());

                var osc = synth.oscs[oscIndex];
                var oscGain = synth.oscGainNodes[oscIndex];
                var envGain = synth.envGainNodes[oscIndex];
                if (synth.waveform === 0)
                    osc.type = 'sine';
                else if (synth.waveform === 1)
                    osc.type = 'square';
                else if (synth.waveform === 2)
                    osc.type = 'sawtooth';

                osc.frequency.value = synth.centreFrequency * (1.0 + oscIndex * synth.harmonicsMultiplier);
                osc.connect(oscGain);
                oscGain.connect(envGain);
                envGain.connect(synth.filter);
                oscGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
                envGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
                osc.start();
            }
        }

        synth.setNumOscs = function(numOscs)
        {
            synth.killOscs();
            synth.numOscs = numOscs;
            synth.initialiseOscs();
        }

        synth.setEnvType = function(envType)
        {
            synth.envType = envType;
            if (synth.envType === EnvType.INFINITE)
            {
                for (var oscIndex = 0; oscIndex < synth.numOscs; oscIndex++)
                {
                    var envGain = synth.envGainNodes[oscIndex];
                    if (envGain != null)
                    {
                        var g = envGain.gain;
                        var now = audioCtx.currentTime;
                        g.cancelScheduledValues(now);
                        g.setValueAtTime(0.1, now);
                    }
                }
            }
        }

        synth.initialiseOscs();

        synth.setCentreFrequency = function (newFreq)
        {
            synth.centreFrequency = newFreq;
            synth.setOscFreqs();
        }

        synth.setHarmonicsMultiplier = function(newH)
        {
            synth.harmonicsMultiplier = newH;
            synth.setOscFreqs();
            synth.updateGains();
        }

        synth.setOscFreqs = function()
        {
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

        synth.updateGains = function()
        {
            for (var oscIndex = 0; oscIndex < synth.numOscs; oscIndex++)
            {
                var envGain = synth.envGainNodes[oscIndex];
                if (envGain != null)
                {
                    var g = envGain.gain;
                    var now = audioCtx.currentTime;
                    g.cancelScheduledValues(now);
                    g.setValueAtTime(g.value, now);
                    if (synth.harmonicsMultiplier === 0.0)
                        g.exponentialRampToValueAtTime(silence, now + 0.1);
                    else
                        g.exponentialRampToValueAtTime((1.0 - (oscIndex / synth.numOscs)) * 0.5, now + 0.1);
                }
            }
        }

        synth.setOscGainsDirect = function(gains)
        {
            for (var oscIndex = 0; oscIndex < synth.numOscs; oscIndex++)
            {
                var oscGain = synth.oscGainNodes[oscIndex];
                if (oscGain != null)
                {
                    var g = oscGain.gain;
                    var now = audioCtx.currentTime;
                    if (g.value === 0.0)
                        g.setValueAtTime(silence, now);
                    else
                        g.setValueAtTime(g.value, now);
                    g.exponentialRampToValueAtTime(Math.max(gains[oscIndex], silence), now + 0.1);
                }
            }
        }

        synth.setOscFreqsDirect = function(freqs)
        {
            const minFreq = 10.0;
            for (var oscIndex = 0; oscIndex < synth.numOscs; oscIndex++)
            {
                var osc = synth.oscs[oscIndex];
                if (osc != null)
                {
                    var f = osc.frequency;
                    var now = audioCtx.currentTime;
                    if (f.value === 0.0)
                        f.setValueAtTime(minFreq, now);
                    else
                        f.setValueAtTime(f.value, now);
                    f.exponentialRampToValueAtTime(Math.max(freqs[oscIndex], minFreq), now + 0.1);
                }
            }
        }

        synth.reset = function()
        {
            synth.shouldRelease = false;
            synth.shouldLoop = true;
            synth.stopOscs();
        }

        synth.setParams = function(waveform, numOscs, a, d, s, r, freq, envType)
        {
            synth.noteOff();
            synth.waveform = waveform;
            synth.setNumOscs(numOscs);
            synth.attackTime = a;
            synth.decayTime = d;
            synth.sustainTime = s;
            synth.releaseTime = r;
            synth.filter.frequency.value = freq;
            synth.reset();
            synth.setEnvType(envType);
        }

        synth.trigger = function (velocity)
        {
            synth.reset();
            synth.lastTriggerTime = audioCtx.currentTime;
            if (velocity > 0)
            {
                synth.velocity = velocity;
                synth.envState = EnvState.ATTACK;
                synth.isPlaying = true;
                for (var oscIndex = 0; oscIndex < synth.numOscs; oscIndex++)
                {
                    var oscGain = synth.oscGainNodes[oscIndex];

                    if (oscGain != null)
                    {
                        var g = oscGain.gain;
                        var t = audioCtx.currentTime;
                        g.cancelScheduledValues(t);
                        //exponentialRampToValueAtTime doesn't like 0s. It won't work if the previous value is <= 0, or if the target value is <= 0.
                        //Thus, we set the value to a small amount before, and fade the env to a small amount during release.
                        g.setValueAtTime(silence, t);
                        synth.envGainNodes[oscIndex].gain.setValueAtTime(1.0, t);
                        if (oscIndex > 0)
                        {
                            if (synth.harmonicsMultiplier === 0.0)
                                synth.envGainNodes[oscIndex].gain.setValueAtTime(0.0, t);
                            else
                                synth.envGainNodes[oscIndex].gain.setValueAtTime((1.0 - (oscIndex / synth.numOscs)) * 0.5, t);
                        }
                        g.exponentialRampToValueAtTime(velocity, t + synth.attackTime);
                        t = t + synth.attackTime;
                        g.exponentialRampToValueAtTime((velocity * synth.sustainProportion), t + synth.decayTime);
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
            else if (synth.envType === EnvType.INFINITE)
                synth.stopOscs();
        }
        synth.triggerReleasePortion = function ()
        {
            synth.envState = EnvState.RELEASE;

            var now = audioCtx.currentTime;
            synth.releaseTriggerTime = now;
            for (let oscIndex = 0; oscIndex < synth.numOscs; ++oscIndex)
            {
                if (synth.oscGainNodes[oscIndex] != null)
                {
                    var g = synth.oscGainNodes[oscIndex].gain;
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
            if (synth.isPlaying)
            {
                var now = audioCtx.currentTime;
                for (let oscIndex = 0; oscIndex < synth.numOscs; ++oscIndex)
                {
                    if (synth.oscGainNodes[oscIndex] != null)
                        synth.oscGainNodes[oscIndex].gain.setValueAtTime(0.0, now);
                }
                synth.isPlaying = false;
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
            return (audioCtx.currentTime - synth.lastTriggerTime) / synth.getTotalEnvTime();
        }
        synth.sustainReached = function()
        {
            return audioCtx.currentTime > synth.lastTriggerTime + synth.getAttackDecayTime();
        }
        synth.envComplete = function()
        {
            return audioCtx.currentTime > synth.releaseTriggerTime + synth.releaseTime;
        }

        synth.changeFrequency = function (amt)
        {
            var f = synth.osc.frequency;
            var fNow = f.value;
            var now = audioCtx.currentTime;
            f.cancelScheduledValues(now);
            f.linearRampToValueAtTime(fNow + amt, now + 0.9);
        }

        synth.updateEnvelope = function()
        {
            if (synth.envType != EnvType.INFINITE)
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
                    {
                        synth.triggerReleasePortion();
                    }
                }
                if (synth.envState === EnvState.RELEASE)
                {
                    if (synth.envComplete())
                    {
                        synth.envState = EnvState.COMPLETE;
                    }
                }
                if (synth.envState === EnvState.COMPLETE)
                {
                    if (synth.envType === EnvType.LOOPING && synth.shouldLoop)
                    {
                        synth.trigger(synth.velocity);
                    }
                    else
                    {
                        synth.stopOscs();
                    }
                }
            }
        }

        synth.updateAudioFeatures = function()
        {
            synth.analyser.getFloatTimeDomainData(synth.timeDomainF);
            synth.analyser.getByteFrequencyData(synth.freqDomain);
            getSpectralCentroid(synth);
            getRMS(synth);
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
