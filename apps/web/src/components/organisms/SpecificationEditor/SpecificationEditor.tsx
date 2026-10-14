import {
  COMPLEXITIES,
  SEVERITIES,
  SPEC_LIMITS,
  TEST_TYPES,
  type Specification,
} from '@devpilot/shared';
import { useEffect, useId, type ReactNode } from 'react';
import {
  Controller,
  get,
  useFieldArray,
  useForm,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { fieldMessageKey } from '../../../i18n/messages';
import { Alert } from '../../atoms/Alert/Alert';
import { Button } from '../../atoms/Button/Button';
import { FieldError } from '../../atoms/FieldError/FieldError';
import { Icon } from '../../atoms/Icon/Icon';
import { LinkButton } from '../../atoms/LinkButton/LinkButton';
import { TextArea } from '../../atoms/TextArea/TextArea';
import { TextInput } from '../../atoms/TextInput/TextInput';
import { ChoiceGroup } from '../../molecules/ChoiceGroup/ChoiceGroup';
import { FormField } from '../../molecules/FormField/FormField';
import styles from './SpecificationEditor.module.css';
import { specificationResolver, toEditorValues, type EditorValues } from './specificationForm';

interface SpecificationEditorProps {
  specification: Specification;
  saving: boolean;
  /** Por qué no se pudo guardar, ya traducido. */
  error?: string | undefined;
  /** A dónde lleva «Cancelar». */
  cancelTo: string;
  onSave: (specification: Specification) => void;
  /** Avisa de si hay cambios sin guardar (RF-EDI-04). */
  onDirtyChange: (dirty: boolean) => void;
}

interface Shared {
  control: Control<EditorValues, unknown, Specification>;
  register: UseFormRegister<EditorValues>;
  errors: FieldErrors<EditorValues>;
}

/** Mensaje traducido del error de un campo, por su ruta en el formulario. */
function useReason(errors: FieldErrors<EditorValues>) {
  const { t } = useTranslation();
  return (path: string): string | undefined => {
    const message: unknown = get(errors, path)?.message;
    return typeof message === 'string' ? t(fieldMessageKey(message)) : undefined;
  };
}

function TextField({
  shared,
  path,
  label,
  multiline = false,
}: {
  shared: Shared;
  path: string;
  label: string;
  multiline?: boolean;
}) {
  const reason = useReason(shared.errors);
  // Las rutas se construyen con índices de useFieldArray: siempre existen en el formulario.
  const registered = shared.register(path as 'title');
  return (
    <FormField label={label} error={reason(path)}>
      {(field) =>
        multiline ? (
          <TextArea rows={3} {...field} {...registered} />
        ) : (
          <TextInput autoComplete="off" {...field} {...registered} />
        )
      }
    </FormField>
  );
}

/** Un elemento de una lista: su título, su contenido y el botón para quitarlo. */
function Item({
  legend,
  onRemove,
  children,
}: {
  legend: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <fieldset className={styles.item}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.itemBody}>{children}</div>
      <div className={styles.itemActions}>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRemove}
          aria-label={t('specification.editor.removeItem', { item: legend })}
        >
          <Icon name="trash" />
          {t('specification.editor.remove')}
        </Button>
      </div>
    </fieldset>
  );
}

/** Error de una lista entera: vacía cuando no puede estarlo, o con demasiados elementos. */
function ListError({ message }: { message: string | undefined }) {
  const id = useId();
  return message ? <FieldError id={id}>{message}</FieldError> : null;
}

function AddButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant="secondary" size="sm" disabled={disabled} onClick={onClick}>
      <Icon name="plus" />
      {label}
    </Button>
  );
}

type LineListPath =
  | 'assumptions'
  | 'edgeCases'
  | `userStories.${number}.acceptanceCriteria`
  | `testCases.${number}.steps`;

/** Una lista de textos de una línea: supuestos, casos límite, criterios o pasos. */
function LinesField({
  shared,
  name,
  item,
  max,
  multiline = false,
}: {
  shared: Shared;
  name: LineListPath;
  item: 'assumption' | 'edgeCase' | 'criterion' | 'step';
  max: number;
  multiline?: boolean;
}) {
  const { t } = useTranslation();
  const reason = useReason(shared.errors);
  const { fields, append, remove } = useFieldArray({ control: shared.control, name });
  const listError = reason(`${name}.root`);

  return (
    <div className={styles.list}>
      {fields.map((field, index) => {
        const label = t(`specification.editor.items.${item}`, { number: index + 1 });
        const path = `${name}.${index}.value`;
        return (
          <div key={field.id} className={styles.line}>
            <div className={styles.lineField}>
              <TextField shared={shared} path={path} label={label} multiline={multiline} />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => remove(index)}
              aria-label={t('specification.editor.removeItem', { item: label })}
            >
              <Icon name="trash" />
            </Button>
          </div>
        );
      })}
      <ListError message={listError} />
      <AddButton
        label={t(`specification.editor.addItem.${item}`)}
        disabled={fields.length >= max}
        onClick={() => append({ value: '' })}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function StoriesField({ shared }: { shared: Shared }) {
  const { t } = useTranslation();
  const reason = useReason(shared.errors);
  const { fields, append, remove } = useFieldArray({
    control: shared.control,
    name: 'userStories',
  });
  const listError = reason('userStories.root');

  return (
    <div className={styles.list}>
      {fields.map((field, index) => (
        <Item
          key={field.id}
          legend={t('specification.editor.items.story', { number: index + 1 })}
          onRemove={() => remove(index)}
        >
          <TextField
            shared={shared}
            path={`userStories.${index}.asA`}
            label={t('specification.editor.fields.asA')}
          />
          <TextField
            shared={shared}
            path={`userStories.${index}.iWant`}
            label={t('specification.editor.fields.iWant')}
            multiline
          />
          <TextField
            shared={shared}
            path={`userStories.${index}.soThat`}
            label={t('specification.editor.fields.soThat')}
            multiline
          />
          <h3 className={styles.subTitle}>{t('specification.story.criteria')}</h3>
          <LinesField
            shared={shared}
            name={`userStories.${index}.acceptanceCriteria`}
            item="criterion"
            max={SPEC_LIMITS.acceptanceCriteria}
          />
        </Item>
      ))}
      <ListError message={listError} />
      <AddButton
        label={t('specification.editor.addItem.story')}
        disabled={fields.length >= SPEC_LIMITS.userStories}
        onClick={() =>
          append({ asA: '', iWant: '', soThat: '', acceptanceCriteria: [{ value: '' }] })
        }
      />
    </div>
  );
}

function TasksField({ shared, side }: { shared: Shared; side: 'frontend' | 'backend' }) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({
    control: shared.control,
    name: `tasks.${side}`,
  });

  return (
    <div className={styles.list}>
      <h3 className={styles.subTitle}>{t(`specification.tasks.${side}`)}</h3>
      {fields.map((field, index) => (
        <Item
          key={field.id}
          legend={`${t(`specification.tasks.${side}`)} · ${t('specification.editor.items.task', {
            number: index + 1,
          })}`}
          onRemove={() => remove(index)}
        >
          <TextField
            shared={shared}
            path={`tasks.${side}.${index}.title`}
            label={t('specification.editor.fields.taskTitle')}
          />
          <TextField
            shared={shared}
            path={`tasks.${side}.${index}.description`}
            label={t('specification.editor.fields.taskDescription')}
            multiline
          />
        </Item>
      ))}
      <AddButton
        label={t('specification.editor.addItem.task')}
        disabled={fields.length >= SPEC_LIMITS.tasks}
        onClick={() => append({ title: '', description: '' })}
      />
    </div>
  );
}

function RisksField({ shared }: { shared: Shared }) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control: shared.control, name: 'risks' });
  const severities = SEVERITIES.map((value) => ({
    value,
    label: t(`specification.severity.${value}`),
  }));

  return (
    <div className={styles.list}>
      {fields.map((field, index) => (
        <Item
          key={field.id}
          legend={t('specification.editor.items.risk', { number: index + 1 })}
          onRemove={() => remove(index)}
        >
          <TextField
            shared={shared}
            path={`risks.${index}.description`}
            label={t('specification.editor.fields.riskDescription')}
            multiline
          />
          <Controller
            control={shared.control}
            name={`risks.${index}.severity`}
            render={({ field: control }) => (
              <ChoiceGroup
                legend={t('specification.editor.fields.severity')}
                options={severities}
                value={control.value}
                onChange={control.onChange}
              />
            )}
          />
          <TextField
            shared={shared}
            path={`risks.${index}.mitigation`}
            label={t('specification.editor.fields.mitigation')}
            multiline
          />
        </Item>
      ))}
      <AddButton
        label={t('specification.editor.addItem.risk')}
        disabled={fields.length >= SPEC_LIMITS.risks}
        onClick={() => append({ description: '', severity: 'medium', mitigation: '' })}
      />
    </div>
  );
}

function TestsField({ shared }: { shared: Shared }) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({
    control: shared.control,
    name: 'testCases',
  });
  const types = TEST_TYPES.map((value) => ({
    value,
    label: t(`specification.tests.type.${value}`),
  }));

  return (
    <div className={styles.list}>
      {fields.map((field, index) => (
        <Item
          key={field.id}
          legend={t('specification.editor.items.test', { number: index + 1 })}
          onRemove={() => remove(index)}
        >
          <TextField
            shared={shared}
            path={`testCases.${index}.title`}
            label={t('specification.editor.fields.testTitle')}
          />
          <Controller
            control={shared.control}
            name={`testCases.${index}.type`}
            render={({ field: control }) => (
              <ChoiceGroup
                legend={t('specification.editor.fields.testType')}
                options={types}
                value={control.value}
                onChange={control.onChange}
              />
            )}
          />
          <LinesField
            shared={shared}
            name={`testCases.${index}.steps`}
            item="step"
            max={SPEC_LIMITS.steps}
          />
          <TextField
            shared={shared}
            path={`testCases.${index}.expectedResult`}
            label={t('specification.editor.fields.expected')}
            multiline
          />
        </Item>
      ))}
      <AddButton
        label={t('specification.editor.addItem.test')}
        disabled={fields.length >= SPEC_LIMITS.testCases}
        onClick={() =>
          append({ title: '', type: 'unit', steps: [{ value: '' }], expectedResult: '' })
        }
      />
    </div>
  );
}

/**
 * Editor de una especificación (RF-EDI-01): se pueden cambiar, añadir y quitar supuestos,
 * historias, criterios, tareas, riesgos, casos límite y casos de prueba. Al guardar se
 * valida con el mismo esquema que la respuesta de la IA (RF-EDI-02).
 */
export function SpecificationEditor({
  specification,
  saving,
  error,
  cancelTo,
  onSave,
  onDirtyChange,
}: SpecificationEditorProps) {
  const { t } = useTranslation();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitted, isValid },
  } = useForm<EditorValues, unknown, Specification>({
    resolver: specificationResolver,
    defaultValues: toEditorValues(specification),
  });
  const shared: Shared = { control, register, errors };
  const sizes = COMPLEXITIES.map((value) => ({
    value,
    label: `${value} · ${t(`specification.complexity.${value}`)}`,
  }));

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  return (
    <form
      className={styles.editor}
      noValidate
      onSubmit={(event) => void handleSubmit(onSave)(event)}
    >
      {error && <Alert>{error}</Alert>}
      {isSubmitted && !isValid && <Alert>{t('specification.editor.invalid')}</Alert>}

      <TextField shared={shared} path="title" label={t('specification.editor.fields.title')} />

      <Section title={t('specification.assumptions.title')}>
        <LinesField
          shared={shared}
          name="assumptions"
          item="assumption"
          max={SPEC_LIMITS.assumptions}
          multiline
        />
      </Section>

      <Section title={t('specification.sections.technical')}>
        <TextField
          shared={shared}
          path="technicalDescription"
          label={t('specification.editor.fields.technicalDescription')}
          multiline
        />
      </Section>

      <Section title={t('specification.sections.stories')}>
        <StoriesField shared={shared} />
      </Section>

      <Section title={t('specification.sections.tasks')}>
        <TasksField shared={shared} side="frontend" />
        <TasksField shared={shared} side="backend" />
      </Section>

      <Section title={t('specification.sections.risks')}>
        <RisksField shared={shared} />
        <h3 className={styles.subTitle}>{t('specification.risks.edgeCases')}</h3>
        <LinesField shared={shared} name="edgeCases" item="edgeCase" max={SPEC_LIMITS.edgeCases} />
      </Section>

      <Section title={t('specification.sections.tests')}>
        <TestsField shared={shared} />
      </Section>

      <Section title={t('specification.sections.complexity')}>
        <Controller
          control={control}
          name="complexity.size"
          render={({ field }) => (
            <ChoiceGroup
              legend={t('specification.editor.fields.size')}
              options={sizes}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <TextField
          shared={shared}
          path="complexity.rationale"
          label={t('specification.editor.fields.rationale')}
          multiline
        />
      </Section>

      <div className={styles.actions}>
        <Button type="submit" disabled={saving}>
          {saving ? t('specification.editor.saving') : t('specification.editor.save')}
        </Button>
        <LinkButton to={cancelTo} variant="secondary">
          {t('specification.editor.cancel')}
        </LinkButton>
      </div>
    </form>
  );
}
