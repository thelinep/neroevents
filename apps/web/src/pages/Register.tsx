import {
  useEffect,
  useState,
} from 'react';

import {
  Button,
  Input,
  Label,
} from '@nevo/ui';

import {
  useDispatch,
  useSelector,
} from 'react-redux';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  register,
} from '../store/slices/authSlice';

import type {
  SubmitEvent,
} from 'react';

import type {
  AppDispatch,
  RootState,
} from '../store';

export default function Register() {
  const [
    displayName,
    setDisplayName,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const dispatch =
    useDispatch<AppDispatch>();

  const navigate =
    useNavigate();

  const {
    token,
    isLoading,
    error,
  } = useSelector(
    (state: RootState) =>
      state.auth,
  );

  useEffect(() => {
    if (token) {
      navigate(
        '/dashboard',
        { replace: true },
      );
    }
  }, [
    token,
    navigate,
  ]);

  const submit = (
    event: SubmitEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    dispatch(
      register({
        email,
        password,
        displayName:
          displayName || undefined,
      }),
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080c16] px-4 text-white">
      <form
        onSubmit={submit}
        className={[
          'w-full max-w-md',
          'rounded-lg',
          'border border-[#1e293b]',
          'bg-[#0f172a]',
          'p-8',
          'shadow-2xl',
        ].join(' ')}
      >
        <h1 className="mb-2 text-center text-2xl font-bold">
          Create your Nevo account
        </h1>

        <p className="mb-6 text-center text-sm text-gray-400">
          Start building with Nevo.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 text-sm text-red-400"
          >
            {error}
          </div>
        )}

        <div className="mb-4 space-y-1">
          <Label htmlFor="display-name">
            Display name
          </Label>

          <Input
            id="display-name"
            name="displayName"
            type="text"
            autoComplete="name"
            placeholder="Display name"
            value={displayName}
            onChange={(event) =>
              setDisplayName(
                event.target.value,
              )
            }
            disabled={isLoading}
          />
        </div>

        <div className="mb-4 space-y-1">
          <Label htmlFor="register-email">
            Email
          </Label>

          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value,
              )
            }
            disabled={isLoading}
            required
          />
        </div>

        <div className="mb-1 space-y-1">
          <Label htmlFor="register-password">
            Password
          </Label>

          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            minLength={12}
            disabled={isLoading}
            required
          />
        </div>

        <p className="mb-4 text-xs text-gray-500">
          12+ characters with
          upper/lowercase, number and
          symbol.
        </p>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading
            ? 'Creating...'
            : 'Create account'}
        </Button>

        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link
            className="text-blue-400 hover:text-blue-300"
            to="/login"
          >
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}