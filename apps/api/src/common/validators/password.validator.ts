import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // Mindestens 12 Zeichen (gemäß Sicherheitsrichtlinie)
    if (password.length < 12) {
      return false;
    }

    // Mindestens ein Großbuchstabe
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Mindestens ein Kleinbuchstabe
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Mindestens eine Zahl
    if (!/\d/.test(password)) {
      return false;
    }

    // Mindestens ein Sonderzeichen
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~';]/.test(password)) {
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'Passwort muss mindestens 12 Zeichen lang sein und Großbuchstaben, Kleinbuchstaben, Zahlen und Sonderzeichen enthalten';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
