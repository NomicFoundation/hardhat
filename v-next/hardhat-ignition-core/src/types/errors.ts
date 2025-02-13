/**
 * ErrorDescriptor is a type that describes an error.
 * It's used to generate error codes and messages.
 *
 * @beta
 */
export interface ErrorDescriptor {
  number: number;
  // Message can use templates. See applyErrorMessageTemplate
  message: string;
}
