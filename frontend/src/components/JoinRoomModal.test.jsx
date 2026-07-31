import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import JoinRoomModal from '../components/JoinRoomModal';

// Mock the api service
vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

const renderModal = (props = {}) => {
  return render(
    <BrowserRouter>
      <JoinRoomModal
        isOpen={true}
        onClose={vi.fn()}
        onJoinRoom={vi.fn()}
        {...props}
      />
    </BrowserRouter>
  );
};

describe('JoinRoomModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    renderModal();
    expect(screen.getByText('Join Room')).toBeInTheDocument();
    expect(screen.getByLabelText('Room Code / ID')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { queryByText } = render(<JoinRoomModal isOpen={false} onClose={vi.fn()} onJoinRoom={vi.fn()} />);
    expect(queryByText('Join Room')).not.toBeInTheDocument();
  });

  it('auto-uppercases input', async () => {
    renderModal();
    const input = screen.getByLabelText('Room Code / ID');
    fireEvent.change(input, { target: { value: 'room-1234' } });
    expect(input.value).toBe('ROOM-1234');
  });

  it('shows error for invalid format', async () => {
    renderModal();
    const input = screen.getByLabelText('Room Code / ID');
    fireEvent.change(input, { target: { value: 'abc' } });
    const submitBtn = screen.getByText('Join Room');
    fireEvent.click(submitBtn);
    expect(screen.getByText(/format/i)).toBeInTheDocument();
  });

  it('calls onJoinRoom with valid code', async () => {
    const onJoinRoom = vi.fn();
    renderModal({ onJoinRoom });
    const input = screen.getByLabelText('Room Code / ID');
    fireEvent.change(input, { target: { value: 'ROOM-ABCD' } });
    const submitBtn = screen.getByText('Join Room');
    fireEvent.click(submitBtn);
    expect(onJoinRoom).toHaveBeenCalledWith('ROOM-ABCD');
  });

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});