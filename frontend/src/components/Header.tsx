import { Link } from "@tanstack/react-router";
import { Home, Menu, Network, X, LayoutDashboard, ClipboardList, Settings, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { ModeToggle } from "./mode-toggle";
import logo from "../logo.svg"

import { RoleGuard } from "./role-guard";

export default function Header() {
	const [isOpen, setIsOpen] = useState(false);
	// Removed unused user variable

	return (
		<>
			<header className="p-4 flex items-center bg-card text-card-foreground border-b shadow-sm">
				<button
					type="button"
					onClick={() => setIsOpen(true)}
					className="p-2 hover:bg-accent rounded-lg transition-colors"
					aria-label="Open menu"
				>
					<Menu size={24} />
				</button>
				<h1 className="ml-4 text-xl font-semibold flex-1">
					<Link to="/">
						<img
							src={logo}
							alt="Logo"
							className="h-8 dark:invert transition-all"
						/>
					</Link>
				</h1>
				<div className="ml-auto">
					<ModeToggle />
				</div>
			</header>

			<aside
				className={`fixed top-0 left-0 h-full w-80 bg-card text-card-foreground border-r shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
					isOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex items-center justify-between p-4 border-b">
					<h2 className="text-xl font-bold">Navigation</h2>
					<button
						type="button"
						onClick={() => setIsOpen(false)}
						className="p-2 hover:bg-accent rounded-lg transition-colors"
						aria-label="Close menu"
					>
						<X size={24} />
					</button>
				</div>

				<nav className="flex-1 p-4 overflow-y-auto">
					<Link
						to="/"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground transition-colors mb-2",
						}}
					>
						<Home size={20} />
						<span className="font-medium">Home</span>
					</Link>

					<Link
						to="/dashboard"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground transition-colors mb-2",
						}}
					>
						<LayoutDashboard size={20} />
						<span className="font-medium">Dashboard</span>
					</Link>

					<Link
						to="/requests"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground transition-colors mb-2",
						}}
					>
						<ClipboardList size={20} />
						<span className="font-medium">My Requests</span>
					</Link>

					<Link
						to="/settings"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors mb-2"
						activeProps={{
							className:
								"flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground transition-colors mb-2",
						}}
					>
						<Settings size={20} />
						<span className="font-medium">Settings</span>
					</Link>

					<RoleGuard requiredPermissions={["manager", "admin"]}>
						<Link
							to="/admin/requests"
							onClick={() => setIsOpen(false)}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors mb-2"
							activeProps={{
								className:
									"flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground transition-colors mb-2",
							}}
						>
							<ShieldCheck size={20} />
							<span className="font-medium">Admin Panel</span>
						</Link>
					</RoleGuard>

					<div className="my-4 border-t pt-4">
						<p className="px-3 text-xs font-semibold text-muted-foreground uppercase mb-2">Development</p>
						<Link
							to="/demo/tanstack-query"
							onClick={() => setIsOpen(false)}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors mb-2"
							activeProps={{
								className:
									"flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground transition-colors mb-2",
							}}
						>
							<Network size={20} />
							<span className="font-medium">TanStack Query</span>
						</Link>
					</div>
				</nav>
			</aside>
		</>
	);
}
