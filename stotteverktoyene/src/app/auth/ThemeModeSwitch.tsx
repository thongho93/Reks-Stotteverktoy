import React from "react";
import styled from "styled-components";

type ThemeModeSwitchProps = {
  checked: boolean;
  ariaLabel?: string;
  onChange: () => void;
};

const StyledWrapper = styled.div`
  --theme-switch-scale: 0.8;
  width: calc(60px * var(--theme-switch-scale));
  height: calc(34px * var(--theme-switch-scale));
  display: inline-flex;
  align-items: center;

  .switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
    cursor: pointer;
    transform: scale(var(--theme-switch-scale));
    transform-origin: left center;
  }

  .switchInput {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background-color: #2196f3;
    transition:
      background-color 0.65s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.65s cubic-bezier(0.22, 1, 0.36, 1);
    z-index: 0;
    overflow: hidden;
  }

  .sunMoon {
    position: absolute;
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: #ffd400;
    transition:
      transform 0.65s cubic-bezier(0.22, 1, 0.36, 1),
      background-color 0.55s ease-in-out;
  }

  .switchInput:checked + .slider {
    background-color: #111827;
  }

  .switchInput:focus-visible + .slider {
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.45);
  }

  .switchInput:checked + .slider .sunMoon {
    transform: translateX(26px);
    background-color: #f9fafb;
    animation: rotate-center 0.8s ease-in-out both;
  }

  .moonDot {
    opacity: 0;
    transition: opacity 0.5s ease-in-out;
    fill: #9ca3af;
  }

  .switchInput:checked + .slider .sunMoon .moonDot {
    opacity: 1;
  }

  .slider.round {
    border-radius: 34px;
  }

  .slider.round .sunMoon {
    border-radius: 50%;
  }

  #moon-dot-1 {
    left: 10px;
    top: 3px;
    position: absolute;
    width: 6px;
    height: 6px;
    z-index: 4;
  }

  #moon-dot-2 {
    left: 2px;
    top: 10px;
    position: absolute;
    width: 10px;
    height: 10px;
    z-index: 4;
  }

  #moon-dot-3 {
    left: 16px;
    top: 18px;
    position: absolute;
    width: 3px;
    height: 3px;
    z-index: 4;
  }

  #light-ray-1 {
    left: -8px;
    top: -8px;
    position: absolute;
    width: 43px;
    height: 43px;
    z-index: -1;
    fill: #fff;
    opacity: 0.1;
  }

  #light-ray-2 {
    left: -50%;
    top: -50%;
    position: absolute;
    width: 55px;
    height: 55px;
    z-index: -1;
    fill: #fff;
    opacity: 0.1;
  }

  #light-ray-3 {
    left: -18px;
    top: -18px;
    position: absolute;
    width: 60px;
    height: 60px;
    z-index: -1;
    fill: #fff;
    opacity: 0.1;
  }

  .cloudLight {
    position: absolute;
    fill: #eee;
    animation: cloud-move 8s ease-in-out infinite;
  }

  .cloudDark {
    position: absolute;
    fill: #ccc;
    animation: cloud-move 8s ease-in-out infinite;
    animation-delay: 1s;
  }

  #cloud-1 {
    left: 30px;
    top: 15px;
    width: 40px;
  }

  #cloud-2 {
    left: 44px;
    top: 10px;
    width: 20px;
  }

  #cloud-3 {
    left: 18px;
    top: 24px;
    width: 30px;
  }

  #cloud-4 {
    left: 36px;
    top: 18px;
    width: 40px;
  }

  #cloud-5 {
    left: 48px;
    top: 14px;
    width: 20px;
  }

  #cloud-6 {
    left: 22px;
    top: 26px;
    width: 30px;
  }

  @keyframes cloud-move {
    0% {
      transform: translateX(0px);
    }
    40% {
      transform: translateX(4px);
    }
    80% {
      transform: translateX(-4px);
    }
    100% {
      transform: translateX(0px);
    }
  }

  @keyframes rotate-center {
    0% {
      transform: translateX(26px) rotate(0deg);
    }
    100% {
      transform: translateX(26px) rotate(360deg);
    }
  }

  .stars {
    transform: translateY(-32px);
    opacity: 0;
    transition:
      transform 0.6s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.6s ease-in-out;
  }

  .star {
    fill: #fff;
    position: absolute;
    transition: 0.5s ease;
    animation: star-twinkle 2.8s ease-in-out infinite;
  }

  .switchInput:checked + .slider .stars {
    transform: translateY(0);
    opacity: 1;
  }

  #star-1 {
    width: 20px;
    top: 2px;
    left: 3px;
    animation-delay: 0.3s;
  }

  #star-2 {
    width: 6px;
    top: 16px;
    left: 3px;
  }

  #star-3 {
    width: 12px;
    top: 20px;
    left: 10px;
    animation-delay: 0.6s;
  }

  #star-4 {
    width: 18px;
    top: 0;
    left: 18px;
    animation-delay: 1.3s;
  }

  @keyframes star-twinkle {
    0% {
      transform: scale(1);
    }
    40% {
      transform: scale(1.2);
    }
    80% {
      transform: scale(0.8);
    }
    100% {
      transform: scale(1);
    }
  }
`;

export default function ThemeModeSwitch({ checked, onChange, ariaLabel }: ThemeModeSwitchProps) {
  const inputId = React.useId();
  const skipNextChangeRef = React.useRef(false);

  return (
    <StyledWrapper>
      <label
        className="switch"
        htmlFor={inputId}
        onPointerDown={(event) => {
          // Trigger mode change immediately on press, not on click release.
          event.preventDefault();
          event.stopPropagation();
          skipNextChangeRef.current = true;
          onChange();
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <input
          id={inputId}
          className="switchInput"
          type="checkbox"
          checked={checked}
          onChange={() => {
            if (skipNextChangeRef.current) {
              skipNextChangeRef.current = false;
              return;
            }
            onChange();
          }}
          aria-label={ariaLabel}
        />
        <div className="slider round">
          <div className="sunMoon">
            <svg id="moon-dot-1" className="moonDot" viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg id="moon-dot-2" className="moonDot" viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg id="moon-dot-3" className="moonDot" viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg id="light-ray-1" viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg id="light-ray-2" viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg id="light-ray-3" viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg id="cloud-1" className="cloudDark" viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg id="cloud-2" className="cloudDark" viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg id="cloud-3" className="cloudDark" viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg id="cloud-4" className="cloudLight" viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg id="cloud-5" className="cloudLight" viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={50} />
            </svg>
            <svg id="cloud-6" className="cloudLight" viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={50} />
            </svg>
          </div>
          <div className="stars">
            <svg id="star-1" className="star" viewBox="0 0 20 20">
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z" />
            </svg>
            <svg id="star-2" className="star" viewBox="0 0 20 20">
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z" />
            </svg>
            <svg id="star-3" className="star" viewBox="0 0 20 20">
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z" />
            </svg>
            <svg id="star-4" className="star" viewBox="0 0 20 20">
              <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z" />
            </svg>
          </div>
        </div>
      </label>
    </StyledWrapper>
  );
}
