import type { GenerationType, Severity, Specification } from '@devpilot/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBadge, type StatusTone } from '../../atoms/StatusBadge/StatusBadge';
import { Tag } from '../../atoms/Tag/Tag';
import styles from './SpecificationView.module.css';

interface SpecificationViewProps {
  specification: Specification;
  type: GenerationType;
}

const SEVERITY_TONE: Record<Severity, StatusTone> = {
  low: 'neutral',
  medium: 'warning',
  high: 'danger',
};

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <span className={styles.number} aria-hidden="true">
          {String(number).padStart(2, '0')}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Una especificación con sus seis secciones (RF-GEN-02), precedida de los supuestos que
 * ha tomado la IA (RF-GEN-10). Todo se muestra como texto: nunca se interpreta como HTML.
 */
export function SpecificationView({ specification, type }: SpecificationViewProps) {
  const { t } = useTranslation();
  const spec = specification;

  return (
    <article className={styles.spec}>
      {/* El título ya es el de la página: aquí van el tipo y el tamaño. */}
      <header className={styles.header}>
        <div className={styles.badges}>
          <StatusBadge tone={type === 'bug' ? 'caution' : 'info'}>
            {t(`history.type.${type}`)}
          </StatusBadge>
          <Tag variant="outline">{spec.complexity.size}</Tag>
        </div>
      </header>

      {spec.assumptions.length > 0 && (
        <aside className={styles.assumptions} aria-labelledby="spec-assumptions">
          <h2 id="spec-assumptions" className={styles.assumptionsTitle}>
            {t('specification.assumptions.title')}
          </h2>
          <p className={styles.assumptionsHint}>{t('specification.assumptions.description')}</p>
          <ul className={styles.list}>
            {spec.assumptions.map((assumption, index) => (
              <li key={index}>{assumption}</li>
            ))}
          </ul>
        </aside>
      )}

      <Section number={1} title={t('specification.sections.technical')}>
        <p className={styles.prose}>{spec.technicalDescription}</p>
      </Section>

      <Section number={2} title={t('specification.sections.stories')}>
        <ol className={styles.cards}>
          {spec.userStories.map((story, index) => (
            <li key={index} className={styles.card}>
              <p className={styles.story}>
                <strong>{t('specification.story.asA')}</strong> {story.asA},{' '}
                <strong>{t('specification.story.iWant')}</strong> {story.iWant},{' '}
                <strong>{t('specification.story.soThat')}</strong> {story.soThat}.
              </p>
              <p className={styles.label}>{t('specification.story.criteria')}</p>
              <ul className={styles.list}>
                {story.acceptanceCriteria.map((criterion, criterionIndex) => (
                  <li key={criterionIndex}>{criterion}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Section>

      <Section number={3} title={t('specification.sections.tasks')}>
        <div className={styles.columns}>
          {(['frontend', 'backend'] as const).map((area) => (
            <div key={area} className={styles.column}>
              <p className={styles.label}>{t(`specification.tasks.${area}`)}</p>
              {spec.tasks[area].length > 0 ? (
                <ol className={styles.tasks}>
                  {spec.tasks[area].map((task, index) => (
                    <li key={index}>
                      <span className={styles.taskTitle}>{task.title}</span>
                      <span className={styles.taskDescription}>{task.description}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.missing}>{t('specification.tasks.none')}</p>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section number={4} title={t('specification.sections.risks')}>
        {spec.risks.length > 0 ? (
          <ul className={styles.cards}>
            {spec.risks.map((risk, index) => (
              <li key={index} className={styles.card}>
                <div className={styles.riskHeader}>
                  <StatusBadge tone={SEVERITY_TONE[risk.severity]}>
                    {t(`specification.severity.${risk.severity}`)}
                  </StatusBadge>
                  <span className={styles.riskText}>{risk.description}</span>
                </div>
                <p className={styles.mitigation}>
                  <strong>{t('specification.risks.mitigation')}:</strong> {risk.mitigation}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.missing}>{t('specification.risks.none')}</p>
        )}
        <p className={styles.label}>{t('specification.risks.edgeCases')}</p>
        {spec.edgeCases.length > 0 ? (
          <ul className={styles.list}>
            {spec.edgeCases.map((edgeCase, index) => (
              <li key={index}>{edgeCase}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.missing}>{t('specification.risks.noEdgeCases')}</p>
        )}
      </Section>

      <Section number={5} title={t('specification.sections.tests')}>
        {spec.testCases.length > 0 ? (
          <ol className={styles.cards}>
            {spec.testCases.map((testCase, index) => (
              <li key={index} className={styles.card}>
                <div className={styles.riskHeader}>
                  <Tag variant="outline">{t(`specification.tests.type.${testCase.type}`)}</Tag>
                  <span className={styles.taskTitle}>{testCase.title}</span>
                </div>
                <ol className={styles.steps}>
                  {testCase.steps.map((step, stepIndex) => (
                    <li key={stepIndex}>{step}</li>
                  ))}
                </ol>
                <p className={styles.mitigation}>
                  <strong>{t('specification.tests.expected')}:</strong> {testCase.expectedResult}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.missing}>{t('specification.tests.none')}</p>
        )}
      </Section>

      <Section number={6} title={t('specification.sections.complexity')}>
        <div className={styles.complexity}>
          <span className={styles.size} translate="no">
            {spec.complexity.size}
          </span>
          <div>
            <p className={styles.taskTitle}>
              {t(`specification.complexity.${spec.complexity.size}`)}
            </p>
            <p className={styles.prose}>{spec.complexity.rationale}</p>
          </div>
        </div>
      </Section>
    </article>
  );
}
