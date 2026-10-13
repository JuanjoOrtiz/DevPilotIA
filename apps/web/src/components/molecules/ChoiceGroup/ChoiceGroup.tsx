import { ToggleButton } from '../../atoms/ToggleButton/ToggleButton';
import styles from './ChoiceGroup.module.css';

export interface Choice<Value extends string> {
  value: Value;
  label: string;
}

interface ChoiceGroupProps<Value extends string> {
  /** Qué se elige, ya traducido. */
  legend: string;
  options: readonly Choice<Value>[];
  value: Value;
  onChange: (value: Value) => void;
}

/** Elección de una opción entre pocas, con botones que se ven pulsados (como «Funcionalidad / Bug»). */
export function ChoiceGroup<Value extends string>({
  legend,
  options,
  value,
  onChange,
}: ChoiceGroupProps<Value>) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <ToggleButton
            key={option.value}
            tone="onLight"
            pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </ToggleButton>
        ))}
      </div>
    </fieldset>
  );
}
