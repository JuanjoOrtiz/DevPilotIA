import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TagInput } from './TagInput';

afterEach(cleanup);

function Harness({ initial = [] as string[], onSubmit = () => undefined }) {
  const [tags, setTags] = useState(initial);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="stack">Stack</label>
      <TagInput
        id="stack"
        value={tags}
        onChange={setTags}
        removeLabel={(tag) => `Quitar ${tag}`}
        maxLength={30}
      />
      <output>{tags.join('|')}</output>
      <button type="submit">Enviar</button>
    </form>
  );
}

const tags = () => screen.getByRole('status').textContent;

describe('TagInput', () => {
  it('adds a tag with Enter or with a comma, without submitting the form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Stack'), ' React {Enter}Node.js,');

    expect(tags()).toBe('React|Node.js');
    expect((screen.getByLabelText('Stack') as HTMLInputElement).value).toBe('');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ignores an empty tag and one that is already there, whatever its case', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['React']} />);

    await user.type(screen.getByLabelText('Stack'), '   {Enter}react{Enter}');

    expect(tags()).toBe('React');
  });

  it('keeps what was typed when the field loses focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Stack'), 'PostgreSQL');
    await user.tab();

    expect(tags()).toBe('PostgreSQL');
  });

  // RNF-10: todo se puede hacer con el teclado.
  it('removes the last tag with Backspace and any tag with its button', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['React', 'Node.js', 'Go']} />);

    await user.click(screen.getByLabelText('Stack'));
    await user.keyboard('{Backspace}');
    expect(tags()).toBe('React|Node.js');

    await user.click(screen.getByRole('button', { name: 'Quitar React' }));
    expect(tags()).toBe('Node.js');
    expect(document.activeElement).toBe(screen.getByLabelText('Stack'));
  });

  it('does not let a tag grow past its maximum length', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Stack'), `${'x'.repeat(40)}{Enter}`);

    expect(tags()).toBe('x'.repeat(30));
  });
});
