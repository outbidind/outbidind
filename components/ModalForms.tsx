"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const categories = [
  "Restaurant",
  "Hotel",
  "Retail",
  "Manufacturing",
  "Healthcare",
  "Education",
  "Technology",
  "Service Business",
  "Other",
];

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100";

function DemoNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900">
      {children}
    </p>
  );
}

function AuthField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
        <span className="text-red-600" aria-hidden="true">
          {" "}
          *
        </span>
      </span>

      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
    </label>
  );
}

export function LoginForm({
  onSignup,
  onSuccess,
}: {
  onSignup: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    const { error: authError } = await createClient().auth.signInWithPassword({
      email,
      password,
    });

    setIsSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <DemoNotice>Use your OutbidInd account to continue.</DemoNotice>

      <AuthField
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
      />

      <AuthField
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={setPassword}
      />

      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#e4572e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c94724] focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting ? "Logging in..." : "Login"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onSignup}
          className="font-bold text-[#d94d28] hover:underline"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}

export function SignupForm({
  onLogin,
  onSuccess,
}: {
  onLogin: () => void;
  onSuccess: (message: string) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    const { data, error: authError } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    setIsSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    onSuccess(
      data.session
        ? "Your account is ready. You are now signed in."
        : "Account created. Check your email to confirm your account before logging in.",
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <DemoNotice>
        Create an OutbidInd account to submit a business listing.
      </DemoNotice>

      <AuthField
        label="Full name"
        placeholder="Your full name"
        value={fullName}
        onChange={setFullName}
      />

      <AuthField
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
      />

      <AuthField
        label="Password"
        type="password"
        placeholder="Create a password"
        value={password}
        onChange={setPassword}
      />

      <AuthField
        label="Confirm password"
        type="password"
        placeholder="Repeat your password"
        value={confirmPassword}
        onChange={setConfirmPassword}
      />

      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#e4572e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c94724] focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting ? "Creating account..." : "Sign up"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onLogin}
          className="font-bold text-[#d94d28] hover:underline"
        >
          Login
        </button>
      </p>
    </form>
  );
}

type ListingValues = {
  businessName: string;
  category: string;
  description: string;
  location: string;
  startingBid: string;
  website: string;
  additionalInformation: string;
};

const emptyListing: ListingValues = {
  businessName: "",
  category: "",
  description: "",
  location: "",
  startingBid: "",
  website: "",
  additionalInformation: "",
};

export function ListingForm() {
  const [values, setValues] = useState(emptyListing);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ListingValues, string>>
  >({});
  const [submitted, setSubmitted] = useState(false);

  const update = (name: keyof ListingValues, value: string) => {
    setValues((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: undefined,
    }));

    setSubmitted(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next: Partial<Record<keyof ListingValues, string>> = {};

    if (!values.businessName.trim()) {
      next.businessName = "Enter your business name.";
    }

    if (!values.category) {
      next.category = "Select a category.";
    }

    if (!values.description.trim()) {
      next.description = "Describe your business.";
    }

    if (!values.location.trim()) {
      next.location = "Enter the business location.";
    }

    if (!values.startingBid || Number(values.startingBid) <= 0) {
      next.startingBid = "Enter an amount greater than zero.";
    }

    if (values.website.trim()) {
      try {
        const url = new URL(values.website);

        if (!/^https?:$/.test(url.protocol)) {
          throw new Error();
        }
      } catch {
        next.website = "Enter a valid URL, including https://.";
      }
    }

    setErrors(next);

    if (!Object.keys(next).length) {
      setSubmitted(true);
    }
  };

  const input = (name: keyof ListingValues, value: string) => {
    update(name, value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5"
    >
      <DemoNotice>
        This is a frontend demo. Your listing is not being saved to the
        database yet.
      </DemoNotice>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-800">
            Business Name <span className="text-red-600">*</span>
          </span>

          <input
            value={values.businessName}
            onChange={(event) =>
              input("businessName", event.target.value)
            }
            placeholder="e.g. The Curry House"
            className={fieldClass}
            aria-invalid={!!errors.businessName}
          />

          {errors.businessName && (
            <span className="mt-2 block text-xs text-red-700">
              {errors.businessName}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-800">
            Business Category <span className="text-red-600">*</span>
          </span>

          <select
            value={values.category}
            onChange={(event) =>
              input("category", event.target.value)
            }
            className={fieldClass}
            aria-invalid={!!errors.category}
          >
            <option value="">Select a category</option>

            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {errors.category && (
            <span className="mt-2 block text-xs text-red-700">
              {errors.category}
            </span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-800">
          Business Description <span className="text-red-600">*</span>
        </span>

        <textarea
          value={values.description}
          onChange={(event) =>
            input("description", event.target.value)
          }
          maxLength={800}
          rows={4}
          placeholder="What makes this business special?"
          className={fieldClass}
          aria-invalid={!!errors.description}
        />

        {errors.description && (
          <span className="mt-2 block text-xs text-red-700">
            {errors.description}
          </span>
        )}
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-800">
            Business Location <span className="text-red-600">*</span>
          </span>

          <input
            value={values.location}
            onChange={(event) =>
              input("location", event.target.value)
            }
            placeholder="City, state"
            className={fieldClass}
            aria-invalid={!!errors.location}
          />

          {errors.location && (
            <span className="mt-2 block text-xs text-red-700">
              {errors.location}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-800">
            Starting Bid <span className="text-red-600">*</span>
          </span>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
              ₹
            </span>

            <input
              type="number"
              min="1"
              step="1"
              value={values.startingBid}
              onChange={(event) =>
                input("startingBid", event.target.value)
              }
              placeholder="0"
              className={`${fieldClass} pl-9`}
              aria-invalid={!!errors.startingBid}
            />
          </div>

          {errors.startingBid && (
            <span className="mt-2 block text-xs text-red-700">
              {errors.startingBid}
            </span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-800">
          Business Website{" "}
          <span className="ml-2 text-xs font-normal text-slate-500">
            Optional
          </span>
        </span>

        <input
          type="url"
          value={values.website}
          onChange={(event) =>
            input("website", event.target.value)
          }
          placeholder="https://yourbusiness.com"
          className={fieldClass}
          aria-invalid={!!errors.website}
        />

        <span className="mt-2 block text-xs text-slate-500">
          This can become a clickable link after approval.
        </span>

        {errors.website && (
          <span className="mt-2 block text-xs text-red-700">
            {errors.website}
          </span>
        )}
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-800">
          Additional Information{" "}
          <span className="ml-2 text-xs font-normal text-slate-500">
            Optional
          </span>
        </span>

        <textarea
          value={values.additionalInformation}
          onChange={(event) =>
            input("additionalInformation", event.target.value)
          }
          maxLength={1000}
          rows={3}
          placeholder="Anything else reviewers should know?"
          className={fieldClass}
        />
      </label>

      {submitted && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          Your listing has been submitted for review. This frontend demo is
          not connected to the database.
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-lg bg-[#e4572e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c94724] focus:outline-none focus:ring-4 focus:ring-orange-200"
      >
        Submit Business
      </button>
    </form>
  );
}