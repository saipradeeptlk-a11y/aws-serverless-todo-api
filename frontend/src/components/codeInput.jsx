
import { useState, useRef } from "react";

export function CodeInput({setCode}) {
    const [digit, setDigit] = useState(["", "", "", "", "", ""]);
    const inputRefs = useRef([]);

    function handleKeydown(event, index) {
        if (event.key === "Backspace"&& !digit[index] && index > 0) {
           inputRefs.current[index - 1].focus();
            
        }
        if(event.key === "ArrowLeft" && index > 0){
           inputRefs.current[index-1].focus();
        }
        if(event.key === "ArrowRight" && index < 5){
           inputRefs.current[index+1].focus();
        }
    }
    function handlePaste(event) {
    event.preventDefault();

    const pastedText = event.clipboardData.getData("text");

    const digits = pastedText
        .replace(/\D/g, "")
        .slice(0, 6);

    const updated = [...digit];

    digits.split("").forEach((value, index) => {
        updated[index] = value;
    });

    setDigit(updated);
    setCode(updated.join(""));

    const nextIndex = Math.min(digits.length, 5);
    inputRefs.current[nextIndex]?.focus();
}

    return (
        <div className="code-row">
            {digit.map((d, index) => {
                return (
                    <input
                        key={index}
                        className="code-box"
                        aria-label={`Digit ${index + 1}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        ref={(element) => {
                            inputRefs.current[index] = element;
                        }}
                        value={d}
                        onChange={(e) => {
                            const updated = [...digit];
                            updated[index] = e.target.value
                                .replace(/\D/g, "")
                                .slice(-1);

                            setDigit(updated);
                            setCode(updated.join(""));


                            if (updated[index] && index < 5) {
                                inputRefs.current[index + 1]?.focus();
                            }
                        }}
                        onKeyDown={(event) => handleKeydown(event, index)}
                        onPaste={handlePaste}
                    />
                );
            })}
        </div>
    );
}
