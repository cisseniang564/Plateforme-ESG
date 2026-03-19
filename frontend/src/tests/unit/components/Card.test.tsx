import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Card from '@/components/common/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Card content</p></Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Card title="My Card"><p>Content</p></Card>);
    expect(screen.getByText('My Card')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(<Card footer={<button>Footer action</button>}><p>Content</p></Card>);
    expect(screen.getByRole('button', { name: 'Footer action' })).toBeInTheDocument();
  });

  it('does not render title header when title is not provided', () => {
    render(<Card><p>Content</p></Card>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
