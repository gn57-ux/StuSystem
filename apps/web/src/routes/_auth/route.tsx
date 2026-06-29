import { Button } from "@student-performance/ui/components/button";
import {
	createFileRoute,
	Outlet,
	redirect,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import {
	BarChart3,
	BookOpen,
	FileText,
	GraduationCap,
	LayoutDashboard,
	LogOut,
	Settings,
	Users,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}
		return { session: session.data };
	},
});

const NAV_ITEMS = [
	{ to: "/dashboard", label: "工作台", icon: LayoutDashboard },
	{ to: "/students", label: "学生管理", icon: Users },
	{ to: "/exams", label: "考试管理", icon: BookOpen },
	{ to: "/analytics/class", label: "学情分析", icon: BarChart3 },
	{ to: "/reports/class", label: "报告中心", icon: FileText },
	{ to: "/settings/classes", label: "系统设置", icon: Settings },
] as const;

function AuthLayout() {
	const navigate = useNavigate();
	const { session } = Route.useRouteContext();
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;

	const handleSignOut = () => {
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => navigate({ to: "/login" }),
			},
		});
	};

	return (
		<div className="flex h-screen overflow-hidden bg-background">
			<aside className="flex w-60 flex-shrink-0 flex-col border-r bg-card">
				<div className="flex h-14 items-center border-b px-4">
					<GraduationCap className="mr-2 h-5 w-5 text-primary" />
					<span className="font-semibold text-sm">成绩分析系统</span>
				</div>

				<nav className="flex-1 space-y-1 overflow-y-auto p-2">
					{NAV_ITEMS.map(({ to, label, icon: Icon }) => {
						const isActive =
							currentPath === to || currentPath.startsWith(`${to}/`);
						return (
							<button
								className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
									isActive
										? "bg-primary text-primary-foreground"
										: "text-muted-foreground hover:bg-muted hover:text-foreground"
								}`}
								key={to}
								onClick={() => navigate({ to: to as never })}
								type="button"
							>
								<Icon className="h-4 w-4 flex-shrink-0" />
								{label}
							</button>
						);
					})}
				</nav>

				<div className="border-t p-3">
					<div className="mb-2 truncate px-2 text-muted-foreground text-xs">
						{session.user.email}
					</div>
					<Button
						className="w-full justify-start gap-2 text-muted-foreground"
						onClick={handleSignOut}
						variant="ghost"
					>
						<LogOut className="h-4 w-4" />
						退出登录
					</Button>
				</div>
			</aside>

			<main className="flex-1 overflow-y-auto">
				<Outlet />
			</main>
		</div>
	);
}
