import React from "react";
import styled from "styled-components";

type PinkSwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  size?: "small" | "medium";
  inputRef?: React.Ref<HTMLInputElement>;
};

const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  --switch-scale: 0.65;

  .switch {
    position: relative;
    height: calc(1.5rem * var(--switch-scale));
    width: calc(3rem * var(--switch-scale));
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    border-radius: 9999px;
    background-color: rgba(100, 116, 139, 0.377);
    transition: all 0.3s ease;
    margin: 0;
  }

  .switch:checked {
    background-color: rgba(34, 197, 94, 1);
  }

  .switch::before {
    position: absolute;
    content: "";
    left: calc((1.5rem - 1.6rem) * var(--switch-scale));
    top: calc((1.5rem - 1.6rem) * var(--switch-scale));
    display: block;
    height: calc(1.6rem * var(--switch-scale));
    width: calc(1.6rem * var(--switch-scale));
    cursor: pointer;
    border: 1px solid rgba(100, 116, 139, 0.527);
    border-radius: 9999px;
    background-color: rgba(255, 255, 255, 1);
    box-shadow: 0 3px 10px rgba(100, 116, 139, 0.327);
    transition: all 0.3s ease;
  }

  .switch:hover::before {
    box-shadow: 0 0 0px calc(8px * var(--switch-scale)) rgba(0, 0, 0, 0.15);
  }

  .switch:checked:hover::before {
    box-shadow: 0 0 0px calc(8px * var(--switch-scale)) rgba(34, 197, 94, 0.15);
  }

  .switch:checked::before {
    transform: translateX(100%);
    border-color: rgba(34, 197, 94, 1);
  }

  .switch:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .switch:disabled::before {
    cursor: not-allowed;
  }
`;

export default function PinkSwitch({
  size: _size,
  inputRef,
  ...inputProps
}: PinkSwitchProps) {
  return (
    <StyledWrapper>
      <input ref={inputRef} className="switch" type="checkbox" {...inputProps} />
    </StyledWrapper>
  );
}
