/** Native RFC 9651 grammar; callers supply the field definition and their resource envelope.
 * Explicit bindings expose the pinned supplier's whole public interface across
 * source compilers that preserve the vendor in its installed Node layout. */
export {
  ParseError, SerializeError, boolean, byteSequence, date, decimal,
  dictionarySchema, displayString, innerList, integer, itemConstruct,
  itemSchema, listSchema, optional, parameters, parseDictionary, parseItem,
  parseList, refine, safeParseDictionary, safeParseItem, safeParseList,
  serializeDictionary, serializeItem, serializeList, string, token, withDefault,
} from "http-structured-fields";
