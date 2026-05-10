import MediaImage from "../shared/media-image";

type ReviewItem = {
  id: string;
  guestName: string;
  title: string;
  content: string;
  rating: number;
  reviewImages?: string[];
  createdAt: string;
  isVerifiedPurchase: boolean;
};

type ProductReviewsPanelProps = {
  reviews: ReviewItem[];
  productName: string;
  reviewTitle: string;
  reviewEmptyText: string;
  verifiedPurchaseLabel: string;
  ratingLabel: string;
  ratingColor: string;
  primaryColor: string;
  cardBorderColor: string;
};

export default function ProductReviewsPanel({
  reviews,
  productName,
  reviewTitle,
  reviewEmptyText,
  verifiedPurchaseLabel,
  ratingLabel,
  ratingColor,
  primaryColor,
  cardBorderColor,
}: ProductReviewsPanelProps): JSX.Element {
  const totalReviews = reviews.length;
  const totalScore = reviews.reduce((sum, item) => sum + item.rating, 0);
  const averageRating = totalReviews ? totalScore / totalReviews : 0;
  const roundedAverage = Math.round(averageRating * 10) / 10;
  const breakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((item) => item.rating === star).length;
    const percent = totalReviews ? (count / totalReviews) * 100 : 0;
    return { star, count, percent };
  });

  return (
    <section className="mt-10 space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900">{reviewTitle}</h2>
      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5" style={{ borderColor: cardBorderColor }}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr] lg:gap-6">
          <div className="space-y-2">
            <p className="text-4xl font-bold text-zinc-900">{roundedAverage.toFixed(1)}</p>
            <p className="text-sm text-zinc-600">
              {totalReviews} {ratingLabel}
            </p>
            <div className="text-xl tracking-wider" style={{ color: ratingColor }}>
              ★★★★★
            </div>
          </div>
          <div className="space-y-2">
            {breakdown.map((item) => (
              <div key={item.star} className="grid grid-cols-[40px_1fr_48px] items-center gap-2 text-sm">
                <span className="text-zinc-700">{item.star}★</span>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                  <div className="h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: primaryColor }} />
                </div>
                <span className="text-right text-zinc-500">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {totalReviews === 0 ? (
        <div className="rounded-2xl border bg-white px-4 py-6 text-center text-sm text-zinc-600 shadow-sm" style={{ borderColor: cardBorderColor }}>
          {reviewEmptyText}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((item) => (
            <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: cardBorderColor }}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <p className="font-semibold text-zinc-900">{item.guestName || "Khách hàng"}</p>
                <span style={{ color: ratingColor }}>{"★".repeat(Math.max(1, Math.min(5, item.rating)))}</span>
                {item.isVerifiedPurchase ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    {verifiedPurchaseLabel}
                  </span>
                ) : null}
                <span className="ml-auto text-xs text-zinc-500">
                  {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>
              {item.title ? <h3 className="mt-2 text-sm font-semibold text-zinc-900">{item.title}</h3> : null}
              <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-zinc-700">{item.content}</p>
              {Array.isArray(item.reviewImages) && item.reviewImages.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-5">
                  {item.reviewImages.slice(0, 5).map((imageUrl, index) => (
                    <a
                      key={`${item.id}-${index}`}
                      href={imageUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block overflow-hidden rounded-lg border bg-zinc-50"
                      style={{ borderColor: cardBorderColor }}
                    >
                      <div className="relative aspect-square w-full">
                        <MediaImage
                          src={imageUrl}
                          alt={`Ảnh đánh giá sản phẩm ${productName}`}
                          fallbackLabel="Ảnh đánh giá"
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 33vw, 20vw"
                        />
                      </div>
                    </a>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
