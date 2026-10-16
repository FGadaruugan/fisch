/** Keep local recovery policy identical in the account preview and import command. */
export function getImportableLocalSnapshot(service){
  return service.getPersistenceStatus().canImport?service.getSnapshot():null;
}
