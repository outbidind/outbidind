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

const businessCategories = [
  "Accounting & Finance",
  "Advertising & Marketing",
  "Agriculture",
  "Automobile",
  "Bakery",
  "Beauty & Salon",
  "Books & Stationery",
  "Business Services",
  "Catering",
  "Clothing & Fashion",
  "Construction",
  "Consulting",
  "Courier & Delivery",
  "Education & Training",
  "Electronics",
  "Entertainment",
  "Event Management",
  "Fitness & Gym",
  "Food & Restaurant",
  "Furniture",
  "Healthcare & Medical",
  "Hotel & Hospitality",
  "IT & Software",
  "Jewellery",
  "Legal Services",
  "Logistics & Transport",
  "Manufacturing",
  "Media & Production",
  "Mobile & Accessories",
  "Pet Services",
  "Pharmacy",
  "Photography",
  "Printing",
  "Real Estate",
  "Repair & Maintenance",
  "Retail",
  "Security Services",
  "Sports",
  "Supermarket & Grocery",
  "Travel & Tourism",
  "Web Design & Development",
  "Wholesale",
  "Other",
];

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

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

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

  const filteredCategories = businessCategories.filter((category) =>
    category.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const validate = () => {
    const nextErrors: Partial<Record<keyof Values, string>> = {};

    if (!values.businessName.trim()) {
      nextErrors.businessName = "Business name is required.";
    }

    if (!values.category.trim()) {
      nextErrors.category = "Please select a business category.";
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

      {/* Category */}
      <div className="relative">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Business Category
        </label>

        <button
          type="button"
          onClick={() => {
            setCategoryOpen((current) => !current);
            setCategorySearch("");
          }}
          className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-sm outline-none transition hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        >
          <span
            className={
              values.category
                ? "text-slate-900"
                : "text-slate-400"
            }
          >
            {values.category ||
              "Select a business category"}
          </span>

          <svg
            className={`h-5 w-5 text-slate-400 transition-transform ${
              categoryOpen ? "rotate-180" : ""
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {categoryOpen && (
          <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.5 3a5.5 5.5 0 104.28 8.95l3.63 3.63a.75.75 0 101.06-1.06l-3.63-3.63A5.5 5.5 0 008.5 3zM4.5 8.5a4 4 0 118 0 4 4 0 01-8 0z"
                    clipRule="evenodd"
                  />
                </svg>

                <input
                  type="text"
                  autoFocus
                  value={categorySearch}
                  onChange={(event) =>
                    setCategorySearch(
                      event.target.value
                    )
                  }
                  placeholder="Search business category..."
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      updateValue(
                        "category",
                        category
                      );
                      setCategoryOpen(false);
                      setCategorySearch("");
                    }}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-orange-50 hover:text-orange-700 ${
                      values.category === category
                        ? "bg-orange-50 font-semibold text-orange-700"
                        : "text-slate-700"
                    }`}
                  >
                    {category}
                  </button>
                ))
              ) : (
                <div className="px-3 py-6 text-center text-sm text-slate-500">
                  No business category found.
                </div>
              )}
            </div>
          </div>
        )}

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