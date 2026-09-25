import { describe, expect, it } from "vitest";
import { skillDomains } from "../src/data/skills";

const domain = (name: string) => skillDomains.find((d) => d.name === name)?.items ?? [];

describe("skill domains", () => {
  it("fold in the LinkedIn skills (spec §6.2)", () => {
    for (const item of ["VMware", "Nutanix", "Veeam"]) {
      expect(domain("Virtualization and storage")).toContain(item);
    }
    for (const item of ["ModSecurity", "CSF and firewalld", "FreeIPA, LDAP and Active Directory"]) {
      expect(domain("Network and security")).toContain(item);
    }
    for (const item of ["Nagios", "Zabbix"]) expect(domain("Observability")).toContain(item);
    expect(domain("Automation and code")).toContain("Perl");
  });

  it("list every tool once", () => {
    const items = skillDomains.flatMap((d) => d.items);
    expect(new Set(items).size).toBe(items.length);
  });
});
