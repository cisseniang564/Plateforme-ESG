import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '@/components/common/Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  };

  it('renders when isOpen is true', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(<Modal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays the title', () => {
    render(<Modal {...defaultProps} title="Mon Titre" />);
    expect(screen.getByText('Mon Titre')).toBeInTheDocument();
  });

  it('renders children correctly', () => {
    render(
      <Modal {...defaultProps}>
        <span data-testid="child">Contenu enfant</span>
      </Modal>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    // The fixed backdrop overlay (inset-0 bg-black)
    const backdrop = document.querySelector('.fixed.inset-0.bg-black');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button (X) is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByTitle('Close modal');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer when provided', () => {
    render(
      <Modal {...defaultProps} footer={<button>Confirmer</button>} />
    );
    expect(screen.getByText('Confirmer')).toBeInTheDocument();
  });

  it('does not render footer section when footer is not provided', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.queryByText('Confirmer')).not.toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <Modal {...defaultProps}>
        <p>Ligne 1</p>
        <p>Ligne 2</p>
      </Modal>
    );
    expect(screen.getByText('Ligne 1')).toBeInTheDocument();
    expect(screen.getByText('Ligne 2')).toBeInTheDocument();
  });
});
