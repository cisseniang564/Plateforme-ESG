import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock useNavigate before importing BackButton
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import BackButton from '@/components/common/BackButton';

describe('BackButton', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('renders with default label "Retour"', () => {
    render(
      <MemoryRouter>
        <BackButton />
      </MemoryRouter>,
    );
    expect(screen.getByText('Retour')).toBeInTheDocument();
  });

  it('renders with a custom label', () => {
    render(
      <MemoryRouter>
        <BackButton label="Données" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Données')).toBeInTheDocument();
  });

  it('renders as a button element', () => {
    render(
      <MemoryRouter>
        <BackButton />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls navigate(-1) when no `to` prop is provided', () => {
    render(
      <MemoryRouter>
        <BackButton />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('calls navigate with the explicit `to` route when provided', () => {
    render(
      <MemoryRouter>
        <BackButton to="/app/data" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/app/data');
  });

  it('does NOT call navigate(-1) when `to` is provided', () => {
    render(
      <MemoryRouter>
        <BackButton to="/app/scores" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(mockNavigate).not.toHaveBeenCalledWith(-1);
  });

  it('applies the default type="button" attribute', () => {
    render(
      <MemoryRouter>
        <BackButton />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('does not navigate on render — only on click', () => {
    render(
      <MemoryRouter>
        <BackButton to="/app/dashboard" />
      </MemoryRouter>,
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
