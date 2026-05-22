import Link from 'next/link'
import { Github, Twitter, Linkedin, Heart } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="bg-card border-t border-border pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                    {/* Brand */}
                    <div className="col-span-2 lg:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-ink rounded-full flex items-center justify-center text-surface font-black">
                                AI
                            </div>
                            <span className="text-xl font-black text-ink">ReCruItAI</span>
                        </div>
                        <p className="text-ink-3 mb-6 max-w-sm leading-relaxed">
                            Transforming the hiring process with advanced AI analysis.
                            Review resumes, verify candidates, and conduct interviews at scale.
                        </p>
                        <div className="flex gap-4">
                            <SocialLink href="#" icon={<Twitter size={20} />} />
                            <SocialLink href="#" icon={<Github size={20} />} />
                            <SocialLink href="#" icon={<Linkedin size={20} />} />
                        </div>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="font-bold text-ink mb-4">Product</h3>
                        <ul className="space-y-3">
                            <FooterLink href="#">Features</FooterLink>
                            <FooterLink href="#">Pricing</FooterLink>
                            <FooterLink href="#">API</FooterLink>
                            <FooterLink href="#">Integrations</FooterLink>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="font-bold text-ink mb-4">Company</h3>
                        <ul className="space-y-3">
                            <FooterLink href="#">About</FooterLink>
                            <FooterLink href="#">Careers</FooterLink>
                            <FooterLink href="#">Blog</FooterLink>
                            <FooterLink href="#">Contact</FooterLink>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="font-bold text-ink mb-4">Legal</h3>
                        <ul className="space-y-3">
                            <FooterLink href="#">Privacy</FooterLink>
                            <FooterLink href="#">Terms</FooterLink>
                            <FooterLink href="#">Security</FooterLink>
                            <FooterLink href="#">Cookies</FooterLink>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-ink-3 text-sm">
                        © {new Date().getFullYear()} ReCruItAI. All rights reserved.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-ink-3">
                        <span>Made with</span>
                        <Heart size={16} className="text-danger fill-danger" />
                        <span>by Engineering Team</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}

function SocialLink({ href, icon }: { href: string; icon: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="w-10 h-10 bg-surface-muted rounded-lg flex items-center justify-center text-ink-3 hover:bg-accent-soft hover:text-accent transition-colors"
        >
            {icon}
        </Link>
    )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <li>
            <Link href={href} className="text-ink-3 hover:text-ink transition-colors">
                {children}
            </Link>
        </li>
    )
}
