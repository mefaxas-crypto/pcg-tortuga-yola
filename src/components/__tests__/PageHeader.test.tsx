
import React from 'react';
import { render, screen } from '@testing-library/react';
import PageHeader from '../PageHeader';
import '@testing-library/jest-dom';

describe('PageHeader', () => {
  it('renders the title correctly', () => {
    const title = 'Test Dashboard';
    render(<PageHeader title={title} />);
    const headingElement = screen.getByRole('heading', { name: title });
    expect(headingElement).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    const title = 'Test With Children';
    const childText = 'Click Me';
    render(
      <PageHeader title={title}>
        <button>{childText}</button>
      </PageHeader>
    );
    const buttonElement = screen.getByRole('button', { name: childText });
    expect(buttonElement).toBeInTheDocument();
  });
});
