/**
 * carTypeImage.ts
 *
 * Returns the default car type image path based on the model's category.
 * Used as a fallback when no custom image is uploaded for a car model.
 *
 * Source images are in: public/Car Types/
 */

const CAR_TYPE_IMAGE_MAP: Record<string, string> = {
  sedan:         "/Car Types/sedan.png",
  suv:           "/Car Types/suv.png",
  hatchback:     "/Car Types/hatchback.png",
  "pickup truck": "/Car Types/pickup.png",
  pickup:        "/Car Types/pickup.png",
  "van / mpv":   "/Car Types/van.png",
  van:           "/Car Types/van.png",
  mpv:           "/Car Types/van.png",
  crossover:     "/Car Types/crossover.png",
  coupe:         "/Car Types/coupe.png",
  convertible:   "/Car Types/convertible.png",
  wagon:         "/Car Types/wagon.png",
  electric:      "/Car Types/electric.png",
  hybrid:        "/Car Types/hybrid.png",
  sports:        "/Car Types/sports.png",
  truck:         "/Car Types/truck.png",
  ev:            "/Car Types/ev.png",
};

/**
 * Returns the correct default image path for a given car category.
 * Falls back to "/no-thumbnail.png" if category is unknown.
 */
export function getCarTypeImage(category: string): string {
  const key = category.trim().toLowerCase();
  return CAR_TYPE_IMAGE_MAP[key] ?? "/no-thumbnail.png";
}

/**
 * Returns the image src for a car model:
 * - Uploaded image (model_img) if available
 * - Otherwise, default image based on car type/category
 */
export function resolveCarModelImage(modelImg: string | null | undefined, category: string): string {
  if (modelImg) return modelImg;
  return getCarTypeImage(category);
}
