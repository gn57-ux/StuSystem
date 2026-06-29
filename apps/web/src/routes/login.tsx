import { createFileRoute, redirect } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (session.data) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const [showSignIn, setShowSignIn] = useState(true);

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
			<div className="w-full max-w-md">
				<div className="mb-6 flex flex-col items-center gap-2">
					<GraduationCap className="h-10 w-10 text-primary" />
					<h1 className="font-bold text-xl">成绩与学情分析系统</h1>
				</div>
				<div className="rounded-xl border bg-card shadow-sm">
					{showSignIn ? (
						<SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
					) : (
						<SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
					)}
				</div>
			</div>
		</div>
	);
}
