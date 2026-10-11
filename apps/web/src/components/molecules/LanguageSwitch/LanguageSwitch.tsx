import { ToggleButton } from '../../atoms/ToggleButton/ToggleButton';
import styles from './LanguageSwitch.module.css';

interface LanguageOption {
  code: string;
  label: string;
}

interface LanguageSwitchProps {
  /** Nombre accesible del grupo, ya traducido. */
  groupLabel: string;
  languages: readonly LanguageOption[];
  current: string;
  onChange: (code: string) => void;
  /** Fondo sobre el que se pinta. */
  tone?: 'onNavy' | 'onLight';
}

/** Selector de idioma. Recibe textos y estado por propiedades: no sabe nada de i18next. */
export function LanguageSwitch({
  groupLabel,
  languages,
  current,
  onChange,
  tone = 'onNavy',
}: LanguageSwitchProps) {
  return (
    <div role="group" aria-label={groupLabel} className={`${styles.group} ${styles[tone]}`}>
      {languages.map((language) => (
        <ToggleButton
          key={language.code}
          tone={tone}
          lang={language.code}
          pressed={language.code === current}
          onClick={() => onChange(language.code)}
        >
          {language.label}
        </ToggleButton>
      ))}
    </div>
  );
}
