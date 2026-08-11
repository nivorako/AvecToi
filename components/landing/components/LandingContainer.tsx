import React from "react"; 

export function LandingContainer({children}: {children: React.ReactNode}){ 
    return(
        <div className="px-6 max-w-container mx-auto ">
            {children}
        </div>
    )
} 