import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import NotFoundPage from '../../src/pages/NotFoundPage';
import { TestProviders } from '../testUtils';

describe('NotFoundPage', () => {
  it('renders a programmatic level-one heading and a route back home', () => {
    render(
      <TestProviders>
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      </TestProviders>,
    );

    expect(screen.getByRole('heading', { level: 1, name: '页面不存在' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回仪表盘' })).toBeInTheDocument();
  });
});
