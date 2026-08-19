import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectInput from '../components/ProjectInput';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('ProjectInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onTasksGenerated with tasks on submit', async () => {
    const onTasksGenerated = vi.fn();

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        tasks: [
          {
            id: 'task-1',
            title: 'Build REST API',
          },
        ],
      },
    });

    render(
      <ProjectInput onTasksGenerated={onTasksGenerated} />
    );

    const textarea = screen.getByPlaceholderText(
      'Describe your project...'
    );

    fireEvent.change(textarea, {
      target: {
        value: 'Build a REST API',
      },
    });

    const button = screen.getByRole('button', {
      name: 'Generate Roadmap',
    });

    fireEvent.click(button);

    await waitFor(() => {
      expect(onTasksGenerated).toHaveBeenCalledWith([
        {
          id: 'task-1',
          title: 'Build REST API',
        },
      ]);
    });

    expect(api.post).toHaveBeenCalledWith(
      '/api/project/generate',
      {
        description: 'Build a REST API',
        provider: 'ollama',
      }
    );
  });
});