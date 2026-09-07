"use client";

import {
  FormEvent,
  useState,
} from "react";

import PaymentPage from "@/components/PaymentPage";
import {
  submitBusinessListing,
} from "@/app/actions/business-listing";

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
  "Accounting & Bookkeeping",
  "Accounting & Finance",
  "Actuarial Services",
  "Advertising",
  "Advertising & Marketing",
  "Aerospace & Aviation",
  "Agricultural Equipment",
  "Agricultural Products",
  "Agriculture",
  "Animal Feed",
  "Animal Health",
  "Antiques & Collectibles",
  "App Development",
  "Appliances",
  "Architecture",
  "Art Galleries",
  "Arts & Crafts",
  "Audio & Music",
  "Audio-Visual Services",
  "Automobile",
  "Automotive",
  "Automotive Parts",
  "Automotive Rental",
  "Automotive Repair",
  "Baby & Maternity",
  "Bakery",
  "Banking",
  "Bars & Pubs",
  "Beauty & Cosmetics",
  "Beauty & Salon",
  "Beauty Salon",
  "Beverage Manufacturing",
  "Bicycle Sales & Repair",
  "Biotechnology",
  "Books & Publishing",
  "Books & Stationery",
  "Building Materials",
  "Business Consulting",
  "Business Process Outsourcing",
  "Business Services",
  "Car Dealership",
  "Car Rental",
  "Car Wash",
  "Catering",
  "Chemical Manufacturing",
  "Childcare & Daycare",
  "Cleaning Services",
  "Clothing & Apparel",
  "Clothing & Fashion",
  "Cloud Computing",
  "Coaching & Training",
  "Coffee Shop",
  "Commercial Real Estate",
  "Computer Hardware",
  "Computer Repair",
  "Construction",
  "Construction Equipment",
  "Consulting",
  "Consumer Electronics",
  "Consumer Goods",
  "Content Creation",
  "Contract Manufacturing",
  "Corporate Services",
  "Courier & Delivery",
  "Cybersecurity",
  "Dairy Products",
  "Dance Studio",
  "Data Analytics",
  "Data Centers",
  "Dental Care",
  "Design Services",
  "Digital Marketing",
  "Digital Products",
  "Disability Services",
  "Disaster Recovery Services",
  "Distribution",
  "Document Services",
  "E-commerce",
  "E-commerce Marketplace",
  "Education",
  "Education & Training",
  "Educational Technology",
  "Electrical Equipment",
  "Electrical Services",
  "Electronics",
  "Electronics Manufacturing",
  "Employment Services",
  "Energy",
  "Engineering",
  "Entertainment",
  "Environmental Services",
  "Event Management",
  "Event Venue",
  "Export & Import",
  "Fabric & Textiles",
  "Factory & Industrial",
  "Farming",
  "Fashion Design",
  "Fashion Retail",
  "Financial Advisory",
  "Financial Technology (FinTech)",
  "Fine Arts",
  "Fishery & Aquaculture",
  "Fitness & Gym",
  "Florist & Flower Shop",
  "Food & Beverage",
  "Food & Restaurant",
  "Food Delivery",
  "Food Manufacturing",
  "Food Processing",
  "Food Wholesale",
  "Footwear",
  "Forestry & Timber",
  "Freight & Logistics",
  "Furniture",
  "Furniture Manufacturing",
  "Gaming",
  "Garden & Landscaping",
  "Gas & Fuel",
  "General Retail",
  "Gift Shop",
  "Glass Manufacturing",
  "Government Services",
  "Graphic Design",
  "Grocery Store",
  "Hair Salon & Barber",
  "Hardware Store",
  "Health & Wellness",
  "Healthcare",
  "Healthcare & Medical",
  "Healthcare Equipment",
  "Healthcare Technology",
  "Home Appliances",
  "Home Decor",
  "Home Improvement",
  "Home Security",
  "Home Services",
  "Horticulture",
  "Hospitality",
  "Hostel",
  "Hotel & Hospitality",
  "Hotels",
  "Human Resources",
  "Import & Export",
  "Industrial Automation",
  "Industrial Equipment",
  "Industrial Manufacturing",
  "Information Technology",
  "Insurance",
  "Interior Design",
  "Internet Services",
  "Investment Services",
  "IT & Software",
  "Jewellery",
  "Jewellery & Accessories",
  "Kids & Toys",
  "Kitchen & Dining",
  "Laboratory Services",
  "Landscaping",
  "Laundry & Dry Cleaning",
  "Legal Services",
  "Leisure & Recreation",
  "Livestock",
  "Loan & Credit Services",
  "Local Services",
  "Logistics",
  "Logistics & Transport",
  "Luxury Goods",
  "Machine Tools",
  "Machinery",
  "Management Consulting",
  "Manufacturing",
  "Marine & Shipping",
  "Marketing",
  "Media",
  "Media & Production",
  "Medical Devices",
  "Medical Laboratory",
  "Medical Supplies",
  "Mental Wellness Services",
  "Metals & Mining",
  "Mobile & Accessories",
  "Mobile App Development",
  "Mobile Phones & Accessories",
  "Mortgage Services",
  "Motorcycle Sales & Repair",
  "Movies & Film Production",
  "Music Production",
  "Music School",
  "Mutual Funds & Asset Management",
  "Natural Resources",
  "News & Journalism",
  "Nonprofit & Social Enterprise",
  "Nursing & Elder Care",
  "Office Supplies",
  "Online Education",
  "Online Services",
  "Optical & Eyewear",
  "Organic Products",
  "Other",
  "Packaging",
  "Paint & Coatings",
  "Personal Care",
  "Personal Finance",
  "Personal Services",
  "Pet Care",
  "Pet Food",
  "Pet Grooming",
  "Pet Services",
  "Pet Shop",
  "Pharmaceuticals",
  "Pharmacy",
  "Photography",
  "Physical Therapy",
  "Printing",
  "Private Security",
  "Professional Services",
  "Property Management",
  "Public Relations",
  "Publishing",
  "Real Estate",
  "Real Estate Brokerage",
  "Real Estate Development",
  "Real Estate Investment",
  "Recycling",
  "Renewable Energy",
  "Rental Services",
  "Repair & Maintenance",
  "Research & Development",
  "Restaurant Technology",
  "Restaurants",
  "Retail",
  "Roadside Assistance",
  "Robotics",
  "Roofing",
  "Safety Equipment",
  "Salon & Spa",
  "School",
  "Scientific Services",
  "Security Services",
  "Senior Care",
  "Shipping",
  "Shopping & E-commerce",
  "Skincare",
  "Software as a Service (SaaS)",
  "Software Development",
  "Solar Energy",
  "Sports",
  "Sports Club",
  "Sports Equipment",
  "Staffing & Recruitment",
  "Storage & Warehousing",
  "Supermarket",
  "Supermarket & Grocery",
  "Supply Chain Services",
  "Taxi & Ride Services",
  "Telecommunications",
  "Telemedicine",
  "Testing & Inspection",
  "Theatre & Performing Arts",
  "Tour Operator",
  "Tourism",
  "Trade Services",
  "Transportation",
  "Travel & Tourism",
  "Travel Agency",
  "Travel Technology",
  "Trucking",
  "Tutoring",
  "Utilities",
  "Vacation Rental",
  "Veterinary Services",
  "Video Production",
  "Waste Management",
  "Water Services",
  "Web Design & Development",
  "Web Hosting",
  "Wedding Services",
  "Wholesale",
  "Wine & Beverage Services",
  "Wood Products",
  "Yoga & Wellness",
];

export function BusinessListingForm({
  onSuccess,
}: {
  onSuccess?: (
    message: string
  ) => void;
}) {
  const [values, setValues] =
    useState<Values>(
      emptyValues
    );

  const [errors, setErrors] =
    useState<
      Partial<
        Record<
          keyof Values,
          string
        >
      >
    >({});

  const [message, setMessage] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    showPayment,
    setShowPayment,
  ] = useState(false);

  const [
    paymentData,
    setPaymentData,
  ] = useState<{
    listingId: string;
    businessName: string;
    bidAmount: number;
  } | null>(null);

  const [
    categoryOpen,
    setCategoryOpen,
  ] = useState(false);

  const [
    categorySearch,
    setCategorySearch,
  ] = useState("");

  const updateValue = (
    field: keyof Values,
    value: string
  ) => {
    setValues(
      (current) => ({
        ...current,
        [field]: value,
      })
    );

    setErrors(
      (current) => ({
        ...current,
        [field]: "",
      })
    );

    setMessage("");
  };

  const filteredCategories =
    businessCategories.filter(
      (category) =>
        category
          .toLowerCase()
          .includes(
            categorySearch.toLowerCase()
          )
    );

  const validate = () => {
    const nextErrors: Partial<
      Record<
        keyof Values,
        string
      >
    > = {};

    if (
      !values.businessName.trim()
    ) {
      nextErrors.businessName =
        "Business name is required.";
    }

    if (
      !values.category.trim()
    ) {
      nextErrors.category =
        "Please select a business category.";
    }

    if (
      !values.description.trim()
    ) {
      nextErrors.description =
        "Description is required.";
    }

    if (
      !values.location.trim()
    ) {
      nextErrors.location =
        "Location is required.";
    }

    if (
      !values.website.trim()
    ) {
      nextErrors.website =
        "Business website is required.";
    }

    if (
      !values.bidAmount.trim()
    ) {
      nextErrors.bidAmount =
        "Bid amount is required.";
    } else {
      const bidAmount =
        Number(
          values.bidAmount
        );

      if (
        !Number.isFinite(
          bidAmount
        ) ||
        bidAmount < 99
      ) {
        nextErrors.bidAmount =
          "Minimum bid is ₹99.";
      }
    }

    setErrors(
      nextErrors
    );

    return (
      Object.keys(
        nextErrors
      ).length === 0
    );
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
      const result =
        await submitBusinessListing({
          businessName:
            values.businessName.trim(),

          category:
            values.category.trim(),

          description:
            values.description.trim(),

          location:
            values.location.trim(),

          website:
            values.website.trim(),

          additionalInformation:
            values.additionalInformation.trim(),

          bidAmount:
            Number(
              values.bidAmount
            ),
        });

      if (result.error) {
        const errorMessage =
          result.error.toLowerCase();

        if (
          result.duplicate
        ) {
          setErrors({
            businessName:
              "A similar business listing already exists.",
          });
        } else if (
          errorMessage.includes(
            "bid"
          ) ||
          errorMessage.includes(
            "amount"
          )
        ) {
          setErrors({
            bidAmount:
              result.error ||
              "Please enter a valid bid amount.",
          });
        } else if (
          errorMessage.includes(
            "website"
          ) ||
          errorMessage.includes(
            "security"
          ) ||
          errorMessage.includes(
            "domain"
          ) ||
          errorMessage.includes(
            "url"
          )
        ) {
          setErrors({
            website:
              result.error ||
              "The website could not pass security checks.",
          });
        } else {
          setMessage(
            result.error
          );
        }

        setIsSubmitting(
          false
        );

        return;
      }

      if (
        result.securityStatus ===
        "approved"
      ) {
        if (
          !result.listingId
        ) {
          setMessage(
            "Security passed, but the listing ID was not returned. Please try again."
          );

          setIsSubmitting(
            false
          );

          return;
        }

        setPaymentData({
          listingId:
            result.listingId,

          businessName:
            values.businessName.trim(),

          bidAmount:
            Number(
              values.bidAmount
            ),
        });

        setShowPayment(
          true
        );

        setValues(
          emptyValues
        );

        setErrors({});

        setMessage("");

        onSuccess?.(
          "Your business passed the security checks and is ready for payment."
        );

        setIsSubmitting(
          false
        );

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

    setIsSubmitting(
      false
    );
  };

  /*
   * =====================================================
   * PAYMENT STEP
   * =====================================================
   */

  if (
    showPayment &&
    paymentData
  ) {
    return (
      <PaymentPage
        listingId={
          paymentData.listingId
        }

        businessName={
          paymentData.businessName
        }

        bidAmount={
          paymentData.bidAmount
        }

        onBack={() => {
          setShowPayment(
            false
          );

          setPaymentData(
            null
          );
        }}
      />
    );
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
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
          Enter your business
          details and bid
          amount. Your
          submission will go
          through security
          checks before
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
          value={
            values.businessName
          }
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
            {
              errors.businessName
            }
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
            setCategoryOpen(
              (current) =>
                !current
            );

            setCategorySearch(
              ""
            );
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

          <span className="text-slate-400">
            ▾
          </span>
        </button>

        {categoryOpen && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-3">
              <input
                type="text"
                value={
                  categorySearch
                }
                onChange={(
                  event
                ) =>
                  setCategorySearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search category..."
                autoFocus
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>

            <div className="max-h-64 overflow-y-auto p-1">
              {filteredCategories.length >
              0 ? (
                filteredCategories.map(
                  (
                    category
                  ) => (
                    <button
                      key={
                        category
                      }
                      type="button"
                      onClick={() => {
                        updateValue(
                          "category",
                          category
                        );

                        setCategoryOpen(
                          false
                        );

                        setCategorySearch(
                          ""
                        );
                      }}
                      className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-orange-50 hover:text-orange-700"
                    >
                      {
                        category
                      }
                    </button>
                  )
                )
              ) : (
                <p className="px-3 py-4 text-sm text-slate-500">
                  No categories
                  found.
                </p>
              )}
            </div>
          </div>
        )}

        {errors.category && (
          <p className="mt-1 text-sm text-red-600">
            {
              errors.category
            }
          </p>
        )}
      </div>

      {/* Description */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Business Description
        </label>

        <textarea
          value={
            values.description
          }
          onChange={(event) =>
            updateValue(
              "description",
              event.target.value
            )
          }
          placeholder="Describe your business"
          rows={5}
          className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />

        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {
              errors.description
            }
          </p>
        )}
      </div>

      {/* Location */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Business Location
        </label>

        <input
          type="text"
          value={
            values.location
          }
          onChange={(event) =>
            updateValue(
              "location",
              event.target.value
            )
          }
          placeholder="City, State"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />

        {errors.location && (
          <p className="mt-1 text-sm text-red-600">
            {
              errors.location
            }
          </p>
        )}
      </div>

      {/* Website */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Business Website
        </label>

        <input
          type="url"
          value={
            values.website
          }
          onChange={(event) =>
            updateValue(
              "website",
              event.target.value
            )
          }
          placeholder="https://example.com"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />

        <p className="mt-1 text-xs text-slate-500">
          Your official
          business website is
          required for security
          verification.
        </p>

        {errors.website && (
          <p className="mt-1 text-sm text-red-600">
            {
              errors.website
            }
          </p>
        )}
      </div>

      {/* Additional Information */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Additional Information
        </label>

        <textarea
          value={
            values.additionalInformation
          }
          onChange={(event) =>
            updateValue(
              "additionalInformation",
              event.target.value
            )
          }
          placeholder="Anything else you want us to know?"
          rows={4}
          className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />
      </div>

      {/* Bid Amount */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Starting Bid
        </label>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
            ₹
          </span>

          <input
            type="number"
            min="99"
            step="1"
            value={
              values.bidAmount
            }
            onChange={(event) =>
              updateValue(
                "bidAmount",
                event.target.value
              )
            }
            placeholder="99"
            className="w-full rounded-lg border border-slate-300 px-8 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Minimum starting bid:
          ₹99
        </p>

        {errors.bidAmount && (
          <p className="mt-1 text-sm text-red-600">
            {
              errors.bidAmount
            }
          </p>
        )}
      </div>

      {/* Message */}

      {message && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      {/* Submit */}

      <button
        type="submit"
        disabled={
          isSubmitting
        }
        className="w-full rounded-lg bg-[#e4572e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c94724] focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting
          ? "Checking & Submitting..."
          : "Continue"}
      </button>
    </form>
  );
}