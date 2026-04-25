import { Hospital, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

import Link from "next/link";
import RevealAnimation from "./framer-motion/revealAnimation";
import { MouseEvent } from "react";
import { Button } from "./ui/button";

export function SiteHeader() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScroll = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    scrollToSection("features-section");
  };

  return (
    <div className="px-4 lg:px-6 h-14 flex justify-between items-center border-b-2">
      <Link href="/" className="flex items-center text-2xl font-bold">
        <Hospital className="mr-4" /> {/* Added margin-right to the icon */}
        MediNexus
      </Link>
    </div>
  );
}

