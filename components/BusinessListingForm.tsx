"use client";

import { FormEvent, useState } from "react";
import PaymentPage from "@/components/PaymentPage";
import { submitBusinessListing } from "@/app/actions/business-listing";

type Values = {
  businessName: string;
  category: string;
  description: string;
  location: string;
  bidAmount: string;
  website: string;
  additionalInformation: string;
};

const emptyValues: Values = {
  businessName: "",
  category: "",
  description: "",
  location: "",
  bidAmount: "",
  website: "",
  additionalInformation: "",
};

export function BusinessListingForm({
  onSuccess,
}: {
  onSuccess?: (message: string) => void;
}) {
  const [values, setValues] = useState<Values>(emptyValues);

  const [errors, setErrors] = useState<
    Partial<Record<keyof Values, string>>
  >({});

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPayment, setShowPayment] = useState(false);

  const [paymentData, setPaymentData] = useState<{
    listingId: string;
    businessName: string;
    bidAmount: number;
  } | null>(null);

  const updateValue = (field: keyof Values, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));

    setMessage("");
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof Values, string>> = {};

    if (!values.businessName.trim()) {
      nextErrors.businessName = "Business name is required.";
    }

    if (!values.category.trim()) {
      nextErrors.category = "Business category is required.";
    }

    if (!values.description.trim()) {
      nextErrors.description = "Description is required.";
    }

    if (!values.location.trim()) {
      nextErrors.location = "Location is required.";
    }

    if (!values.bidAmount.trim()) {
      nextErrors.bidAmount = "Bid amount is required.";
    } else {
      const bidAmount = Number(values.bidAmount);

      if (!Number.isFinite(bidAmount)) {
        nextErrors.bidAmount = "Enter a valid bid amount.";
      } else if (bidAmount < 99) {
        nextErrors.bidAmount = "Minimum bid amount is ₹99.";
      }
    }

    if (values.website.trim()) {
      try {
        const websiteUrl = new URL(values.website.trim());

        if (
          websiteUrl.protocol !== "http:" &&
          websiteUrl.protocol !== "https:"
        ) {
          nextErrors.website =
            "Website must start with http:// or https://.";
        }
      } catch {
        nextErrors.website = "Enter a valid website URL.";
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage("");

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitBusinessListing({
        businessName: values.businessName.trim(),
        category: values.category.trim(),
        description: values.description.trim(),
        location: values.location.trim(),
        website: values.website.trim(),
        additionalInformation:
          values.additionalInformation.trim(),
        bidAmount: Number(values.bidAmount),
      });

      if (result.error) {
        const errorMessage = result.error.toLowerCase();

        if (result.duplicate) {
          setErrors({
            businessName:
              "A similar business listing already exists.",
          });
        } else if (
          errorMessage.includes("bid") ||
          errorMessage.includes("amount")
        ) {
          setErrors({
            bidAmount:
              result.error ||
              "Please enter a valid bid amount.",
          });
        } else if (
          errorMessage.includes("website") ||
          errorMessage.includes("security") ||
          errorMessage.includes("domain") ||
          errorMessage.includes("url")
        ) {
          setErrors({
            website:
              result.error ||
              "The website could not pass security checks.",
          });
        } else {
          setMessage(result.error);
        }

        setIsSubmitting(false);
        return;
      }

      if (result.securityStatus === "approved") {
        if (!result.listingId) {
          setMessage(
            "Security passed, but the listing ID was not returned. Please try again."
          );
          setIsSubmitting(false);
          return;
        }

        setPaymentData({
          listingId: result.listingId,
          businessName: values.businessName.trim(),
          bidAmount: Number(values.bidAmount),
        });

        setShowPayment(true);
        setValues(emptyValues);
        setErrors({});
        setMessage("");

        onSuccess?.(
          "Your business passed the security checks and is ready for payment."
        );

        setIsSubmitting(false);
        return;
      }

      setMessage(
        "Your business could not pass the required security checks."
      );
    } catch (error) {
      console.error(
        "Business listing submission failed:",
        error
      );

      setMessage(
        "Something went wrong while submitting your business. Please try again."
      );
    }

    setIsSubmitting(false);
  };

  /* Payment step */
  if (showPayment && paymentData) {
    return (
      <PaymentPage
        listingId={paymentData.listingId}
        businessName={paymentData.businessName}
        bidAmount={paymentData.bidAmount}
        onBack={() => {
          setShowPayment(false);
          setPaymentData(null);
        }}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div>
        <p className="text-sm font-semibold text-orange-600">
          List Your Business
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Submit Your Business
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Enter your business details and bid amount. Your
          submission will go through security checks before
          payment.
        </p>
      </div>

      {/* Business Name */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Business Name
        </label>

        <input
          type="text"
          value={values.businessName}
          onChange={(event) =>
            updateValue(
              "businessName",
              event.target.value
            )
          }
          placeholder="Enter your business name"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />

        {errors.businessName && (
          <p className="mt-1 text-sm text-red-600">
            {errors.businessName}
          </p>
        )}
      </div>

      {/* Business Category */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Business Category
        </label>

        <input
          type="text"
          value={values.category}
          onChange={(event) =>
            updateValue(
              "category",
              event.target.value
            )
          }
          placeholder="Enter your business category"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />

        <p className="mt-1 text-xs text-slate-500">
          Enter any category that best describes your business.
        </p>

        {errors.category && (
          <p className="mt-1 text-sm text-red-600">
            {errors.category}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Business Description
        </label>

        <textarea
          value={values.description}
          onChange={(event) =>
            updateValue(
              "description",
              event.target.value
            )
          }
          placeholder="Describe your business"
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />

        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.description}
          </p>
        )}
      </div>

      {/* Location */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Location
        </label>

        <input
          type="text"
          value={values.location}
          onChange={(event) =>
            updateValue(
              "location",
              event.target.value
            )
          }
          placeholder="City / Area"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />

        {errors.location && (
          <p className="mt-1 text-sm text-red-600">
            {errors.location}
          </p>
        )}
      </div>

      {/* Bid Amount */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Bid Amount (₹)
        </label>

        <input
          type="number"
          min="99"
          value={values.bidAmount}
          onChange={(event) =>
            updateValue(
              "bidAmount",
              event.target.value
            )
          }
          placeholder="Enter starting bid"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />

        <p className="mt-1 text-xs text-slate-500">
          Minimum bid amount: ₹99
        </p>

        {errors.bidAmount && (
          <p className="mt-1 text-sm text-red-600">
            {errors.bidAmount}
          </p>
        )}
      </div>

      {/* Website */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Business Website
          <span className="ml-1 font-normal text-slate-400">
            (Optional)
          </span>
        </label>

        <input
          type="url"
          value={values.website}
          onChange={(event) =>
            updateValue(
              "website",
              event.target.value
            )
          }
          placeholder="https://example.com"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />

        {errors.website && (
          <p className="mt-1 text-sm text-red-600">
            {errors.website}
          </p>
        )}
      </div>

      {/* Additional Information */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Additional Information
          <span className="ml-1 font-normal text-slate-400">
            (Optional)
          </span>
        </label>

        <textarea
          value={values.additionalInformation}
          onChange={(event) =>
            updateValue(
              "additionalInformation",
              event.target.value
            )
          }
          placeholder="Any additional information"
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />
      </div>

      {/* Security Notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-blue-900">
          Security Check
        </p>

        <p className="mt-1 text-xs leading-5 text-blue-700">
          Your business information and website will be
          checked before proceeding to payment.
        </p>
      </div>

      {/* Error Message */}
      {message && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {message}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[#e4572e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c94724] focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-wait disabled:opacity-70"
      >
        {isSubmitting ? "Checking..." : "Continue"}
      </button>
    </form>
  );
}