import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusTag } from '../../src/components/StatusTag/StatusTag';

describe('StatusTag', () => {
  it('renders centralized labels for every entity kind', () => {
    const { rerender } = render(<StatusTag kind="customer" value="active" />);
    expect(screen.getByText('合作中')).toBeInTheDocument();

    rerender(<StatusTag kind="project" value="on_hold" />);
    expect(screen.getByText('已暂停')).toBeInTheDocument();

    rerender(<StatusTag kind="order" value="pending" />);
    expect(screen.getByText('待处理')).toBeInTheDocument();

    rerender(<StatusTag kind="user" value="disabled" />);
    expect(screen.getByText('停用')).toBeInTheDocument();
  });

  it('exposes theme-aware tone variables for light and dark surfaces', () => {
    const { container } = render(<StatusTag kind="customer" value="active" />);
    const tag = container.querySelector('.status-tag') as HTMLElement;
    expect(tag.style.getPropertyValue('--status-color')).toBe('#15803d');
    expect(tag.style.getPropertyValue('--status-color-dark')).toBe('#4ade80');
    expect(tag.style.getPropertyValue('--status-bg-dark')).toBe('#172f28');
  });

  it('falls back to the raw value for unknown statuses', () => {
    render(<StatusTag kind="project" value="legacy_status" />);
    expect(screen.getByText('legacy_status')).toBeInTheDocument();
  });
});
