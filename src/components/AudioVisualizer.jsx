import { useRef, useCallback, useEffect } from "react";

export function AudioVisualizer({ stream, ...props }) {
    const canvasRef = useRef(null);

    const visualize = useCallback((stream) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const drawVisual = () => {
            requestAnimationFrame(drawVisual);
            analyser.getByteFrequencyData(dataArray);

            // Create gradient background
            const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(236, 72, 153, 0.1)'); // accent color
            gradient.addColorStop(1, 'rgba(14, 165, 233, 0.1)'); // primary color
            
            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * canvas.height;

                // Create gradient for bars
                const barGradient = canvasCtx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
                barGradient.addColorStop(0, 'rgba(236, 72, 153, 0.8)'); // accent color
                barGradient.addColorStop(1, 'rgba(14, 165, 233, 0.8)'); // primary color

                canvasCtx.fillStyle = barGradient;

                // Draw rounded bars
                canvasCtx.beginPath();
                canvasCtx.moveTo(x + barWidth * 0.5, canvas.height - barHeight);
                canvasCtx.lineTo(x + barWidth * 0.5, canvas.height);
                canvasCtx.lineWidth = barWidth * 0.8;
                canvasCtx.lineCap = 'round';
                canvasCtx.strokeStyle = barGradient;
                canvasCtx.stroke();

                x += barWidth;
            }
        };

        drawVisual();

        return () => {
            audioContext.close();
        };
    }, []);

    useEffect(() => {
        let cleanup;
        if (stream) {
            cleanup = visualize(stream);
        }
        return () => cleanup?.();
    }, [visualize, stream]);

    return (
        <canvas 
            {...props} 
            width={720} 
            height={240} 
            ref={canvasRef}
            className={`rounded-xl ${props.className || ''}`}
        />
    );
}
