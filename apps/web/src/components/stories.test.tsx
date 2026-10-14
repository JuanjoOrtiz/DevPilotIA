import { composeStories, setProjectAnnotations } from '@storybook/react';
import { cleanup, render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import preview from '../../.storybook/preview';

// RNF-18: cada historia del catálogo se pinta en los tests, así que una historia que no
// compila o que falla al pintarse rompe el CI igual que cualquier otro test.
setProjectAnnotations(preview);

const modules = import.meta.glob<Record<string, unknown>>('./**/*.stories.tsx', { eager: true });

afterEach(cleanup);

describe('Storybook stories', () => {
  it('cover every atom and every molecule', () => {
    const components = Object.keys(
      import.meta.glob('./{atoms,molecules}/*/*.tsx', { eager: false }),
    ).filter((path) => !/\.(test|stories)\.tsx$/.test(path));
    const withStories = new Set(
      Object.keys(modules).map((path) => path.replace('.stories.tsx', '.tsx')),
    );

    expect(components.filter((path) => !withStories.has(path))).toEqual([]);
  });

  for (const [path, module] of Object.entries(modules)) {
    const stories = composeStories(module as Parameters<typeof composeStories>[0]);
    for (const [name, Story] of Object.entries(stories) as [string, ComponentType][]) {
      it(`renders ${path} › ${name}`, () => {
        const { container } = render(<Story />);
        expect(container).toBeTruthy();
      });
    }
  }
});
