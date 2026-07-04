import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-bold text-brand">The Alumni Center</h1>
        <SignUp
          appearance={{ variables: { colorPrimary: "#0F5898" } }}
          routing="path"
          path="/sign-up"
          fallbackRedirectUrl="/wallet"
        />
      </div>
    </div>
  );
}
