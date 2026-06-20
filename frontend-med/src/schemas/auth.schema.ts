import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalid"),
  password: z.string().min(8, "Minim 8 caractere"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Minim 3 caractere").max(30, "Maxim 30 de caractere"),
  firstName: z.string().min(1, "Câmp obligatoriu"),
  lastName: z.string().min(1, "Câmp obligatoriu"),
  email: z.string().email("Email invalid"),
  password: z
    .string()
    .min(8, "Minim 8 caractere")
    .regex(/[A-Z]/, "Minim o literă mare")
    .regex(/[0-9]/, "Minim o cifră"),
  facultyId: z.string().uuid("Selectează o facultate"),
  yearOfStudy: z.coerce.number().min(1, "Minim anul 1").max(6, "Maxim anul 6"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.input<typeof registerSchema>;
