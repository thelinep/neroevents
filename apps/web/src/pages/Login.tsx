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
  login,
} from '../store/slices/authSlice';

import type {
  SubmitEvent,
} from 'react';

import type {
  AppDispatch,
  RootState,
} from '../store';

export default function Login() {
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
      navigate('/dashboard');
    }
  }, [
    token,
    navigate,
  ]);

  const handleSubmit = (
    event: SubmitEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !email ||
      !password
    ) {
      return;
    }

    dispatch(
      login({
        email,
        password,
      }),
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080c16] px-4">
      <form
        onSubmit={handleSubmit}
        className={[
          'w-full max-w-md',
          'rounded-lg',
          'border border-[#1e293b]',
          'bg-[#0f172a]',
          'p-8',
          'text-white',
          'shadow-2xl',
        ].join(' ')}
      >
        <h1 className="mb-6 text-center text-2xl font-bold">
          Sign In
        </h1>

        {error && (
          <div
            role="alert"
            className="mb-4 text-sm text-red-400"
          >
            {error}
          </div>
        )}

        <div className="mb-4 space-y-1">
          <Label htmlFor="email">
            Email
          </Label>

          <Input
            id="email"
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

        <div className="mb-6 space-y-1">
          <Label htmlFor="password">
            Password
          </Label>

          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            disabled={isLoading}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading
            ? 'Signing in...'
            : 'Login'}
        </Button>

        <p className="mt-4 text-center text-sm text-gray-400">
          New to Nevo?{' '}
          <Link
            className="text-blue-400 hover:text-blue-300"
            to="/register"
          >
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}