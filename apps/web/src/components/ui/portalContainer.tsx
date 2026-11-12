import * as React from 'react';

//modais travam o scroll de tudo fora do próprio conteúdo; popups precisam renderizar dentro dele
const PortalContainerContext = React.createContext<HTMLElement | null>(null);

function PortalContainerProvider({
	container,
	children,
}: {
	container: HTMLElement | null;
	children: React.ReactNode;
}) {
	return (
		<PortalContainerContext.Provider value={container}>
			{children}
		</PortalContainerContext.Provider>
	);
}

function usePortalContainer() {
	return React.useContext(PortalContainerContext) ?? undefined;
}

export { PortalContainerProvider, usePortalContainer };
