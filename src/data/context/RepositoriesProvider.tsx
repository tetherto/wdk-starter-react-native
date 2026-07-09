import React, { createContext, useContext } from 'react';
import type { WalletRepository } from '../repositories/types';
import { mockWalletRepository } from '../mock/mockWalletRepository';

/**
 * Dependency-injection boundary for data repositories.
 *
 * Screens NEVER import a concrete repository. They call useWalletRepository(),
 * which returns whatever implementation this provider supplies. Today that's
 * the mock; when WDK lands, swap the default (or pass a prop) to the real
 * WDK-backed repository — no screen changes required.
 */
export interface Repositories {
  wallet: WalletRepository;
}

const defaultRepositories: Repositories = {
  wallet: mockWalletRepository,
};

const RepositoriesContext = createContext<Repositories>(defaultRepositories);

export function RepositoriesProvider({
  children,
  repositories = defaultRepositories,
}: {
  children: React.ReactNode;
  repositories?: Repositories;
}) {
  return (
    <RepositoriesContext.Provider value={repositories}>
      {children}
    </RepositoriesContext.Provider>
  );
}

/** Access all repositories. */
export function useRepositories(): Repositories {
  return useContext<Repositories>(RepositoriesContext);
}

/** Convenience accessor for the wallet repository. */
export function useWalletRepository(): WalletRepository {
  return useContext<Repositories>(RepositoriesContext).wallet;
}
