// @c:\Users\rakotondrabe\Documents\next js\avectoi\components\landing\ui\SchemaPlaceholder.tsx
import { Placeholder } from "./Placeholder";

export function SchemaPlaceholder() {
    return (
        <div className="w-full max-w-lg md:max-w-xl mx-auto border border-gray-300 rounded-lg p-8 space-y-8">
            {/* Cercle du haut, centré */}
            <div className="flex justify-center">
                <Placeholder type="icon" />
            </div>

            {/* Ligne du milieu : cercle — trait — carrés empilés — trait — cercle */}
            <div className="flex items-center justify-center gap-4">
                <Placeholder type="icon" />
                <div className="h-px bg-gray-300 w-16" />
                <div className="flex flex-col items-center gap-1 w-32">
                    <Placeholder type="cardTitle" />
                    <Placeholder type="cardTitle" />
                </div>
                <div className="h-px bg-gray-300 w-16" />
                <Placeholder type="icon" />
            </div>

            {/* Deux cercles en bas, de chaque côté */}
            <div className="flex justify-between px-8">
                <Placeholder type="icon" />
                <Placeholder type="icon" />
            </div>
        </div>
    );
}