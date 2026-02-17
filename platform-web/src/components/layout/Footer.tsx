import Link from 'next/link'
import { Github, Twitter, Linkedin, Heart } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                    {/* Brand */}
                    <div className="col-span-2 lg:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                                AI
                            </div>
                            <span className="text-xl font-bold text-gray-900">Recruiter.ai</span>
                        </div>
                        <p className="text-gray-500 mb-6 max-w-sm leading-relaxed">
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
                        <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
                        <ul className="space-y-3">
                            <FooterLink href="#">Features</FooterLink>
                            <FooterLink href="#">Pricing</FooterLink>
                            <FooterLink href="#">API</FooterLink>
                            <FooterLink href="#">Integrations</FooterLink>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
                        <ul className="space-y-3">
                            <FooterLink href="#">About</FooterLink>
                            <FooterLink href="#">Careers</FooterLink>
                            <FooterLink href="#">Blog</FooterLink>
                            <FooterLink href="#">Contact</FooterLink>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
                        <ul className="space-y-3">
                            <FooterLink href="#">Privacy</FooterLink>
                            <FooterLink href="#">Terms</FooterLink>
                            <FooterLink href="#">Security</FooterLink>
                            <FooterLink href="#">Cookies</FooterLink>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-500 text-sm">
                        © {new Date().getFullYear()} Recruiter.ai. All rights reserved.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Made with</span>
                        <Heart size={16} className="text-red-500 fill-red-500" />
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
            className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
        >
            {icon}
        </Link>
    )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <li>
            <Link href={href} className="text-gray-500 hover:text-blue-600 transition-colors">
                {children}
            </Link>
        </li>
    )
}
