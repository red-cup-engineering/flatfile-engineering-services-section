/**
 * writing/spectral — native-number boundary helpers for spectral polynomial
 * carriers. The polynomial arithmetic stays exact (Integer coefficients); these
 * read coefficients to/from native integers only at the representation boundary.
 */
import { integerPolynomial, } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/spectral";
import { fromInt, toInt } from "@red-cup-engineering/exact-number-data-service/exact-number";


/** Build an IntegerPolynomial from native integer coefficients (ascending degree). */
export const polyFromInts = (values) =>
  integerPolynomial(values.map(fromInt));

/** Read an IntegerPolynomial's coefficients as native integers (ascending degree). */
export const polyToInts = (poly) =>
  Object.freeze(poly.map(toInt));
