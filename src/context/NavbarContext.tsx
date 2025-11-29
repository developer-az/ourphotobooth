"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface NavbarContextType {
    centerContent: ReactNode;
    setCenterContent: (content: ReactNode) => void;
}

const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export function NavbarProvider({ children }: { children: ReactNode }) {
    const [centerContent, setCenterContent] = useState<ReactNode>(null);

    return (
        <NavbarContext.Provider value={{ centerContent, setCenterContent }}>
            {children}
        </NavbarContext.Provider>
    );
}

export function useNavbar() {
    const context = useContext(NavbarContext);
    if (context === undefined) {
        throw new Error("useNavbar must be used within a NavbarProvider");
    }
    return context;
}
