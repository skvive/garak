/**
 * Compatibility re-exports — prefer `@/lib/pdp/amba-casts` for PDP.
 * Listing UI also uses public/casts/amba (lookbook-done).
 */
export {
  listAmbaCasts,
  pickAmbaCast,
  toModelCast,
  castFaceFsPath,
  type AmbaCast,
  type ModelCastProfile,
  type CastPickOpts,
} from "@/lib/pdp/amba-casts";
