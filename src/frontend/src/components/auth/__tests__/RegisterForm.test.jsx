import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RegisterForm from '../RegisterForm.jsx';

function renderRegisterForm(overrideProps = {}) {
  const defaultProps = {
    formState: {
      name: '',
      email: '',
      password: ''
    },
    error: '',
    submitting: false,
    onChange: jest.fn(),
    onSubmit: jest.fn((event) => event.preventDefault())
  };

  const props = { ...defaultProps, ...overrideProps };
  const utils = render(
    <MemoryRouter>
      <RegisterForm {...props} />
    </MemoryRouter>
  );

  return { ...utils, props };
}

// Verify the form renders and forwards user interactions to the injected handlers.
it('renders the register form and wires up change and submit handlers', async () => {
  const user = userEvent.setup();
  const { props } = renderRegisterForm();

  await user.type(screen.getByLabelText(/name/i), 'Ada Lovelace');
  await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
  await user.type(screen.getByLabelText(/password/i), 'Passw0rd!');
  await user.click(screen.getByRole('button', { name: /create account/i }));

  expect(props.onChange).toHaveBeenCalled();
  expect(props.onSubmit).toHaveBeenCalled();
});

// Ensure error feedback and disabled state appear while a submission is pending.
it('shows validation errors and disables the submit button while submitting', () => {
  renderRegisterForm({
    error: 'Email already in use',
    submitting: true
  });

  expect(screen.getByText(/email already in use/i)).toBeInTheDocument();
  const button = screen.getByRole('button', { name: /creating account/i });
  expect(button).toBeDisabled();
});
