# Outcome 6: Not a Regulated System

## Overview

This outcome applies when an AI system does **not** qualify as a "high-risk artificial intelligence system" under the Colorado AI Act. Systems that are not high-risk are not subject to the Act's primary obligations for developers and deployers.

## How Systems Qualify as "Not Regulated"

An AI system is **not regulated** as a high-risk system when it:

1. **Does not make consequential decisions**, OR
2. **Is not a substantial factor in making consequential decisions**

## Determining Non-High-Risk Status

### Systems That Do NOT Make Consequential Decisions

**Reference**: § 6-1-1701(3) and § 6-1-1701(9)

An AI system is not high-risk if it does not make decisions that have a material legal or similarly significant effect on the provision or denial of, or the cost or terms of:

- Education enrollment or educational opportunities
- Employment or employment opportunities
- Financial or lending services
- Essential government services
- Health-care services
- Housing
- Insurance
- Legal services

**Examples of non-consequential AI systems:**
- AI systems that provide general information or recommendations
- Entertainment and gaming AI (unless used for consequential decisions)
- Marketing and advertising optimization systems (that don't affect access to services)
- Internal business analytics tools
- Content generation systems for non-consequential purposes

### Systems That Are Not Substantial Factors

**Reference**: § 6-1-1701(15) and § 6-1-1701(9)

Even if an AI system is involved in processes related to consequential decisions, it is not high-risk if it:

- Is not used to assist in making the decision, OR
- Is not capable of altering the outcome of the decision

**Examples:**
- AI that only performs data entry or organization
- Systems that detect patterns but make no recommendations
- Tools that present information without analysis or scoring

## Statutory Exclusions from High-Risk Classification

### Narrow Procedural Tasks

**Reference**: § 6-1-1701(9)

AI systems that perform **narrow procedural tasks** or that **detect decision-making patterns** or deviations from prior patterns **and make no recommendation** are explicitly excluded from the definition of high-risk systems.

**Examples:**
- Scheduling systems
- Data validation tools
- Audit or monitoring systems that only flag deviations
- Process automation tools that execute predetermined procedures

### Technology-Specific Exclusions

**Reference**: § 6-1-1701(9)

The following technologies are **presumptively not high-risk** unless they are used to make, or are a substantial factor in making, a consequential decision:

- Anti-fraud technology (that does not use facial recognition)
- Anti-malware, anti-virus, and firewall technology
- AI used solely for video game development
- Calculators
- Cybersecurity applications and infrastructure
- Databases and data storage applications
- Internet domain registration and website hosting
- Spell-checking applications
- Spreadsheets
- Web caching or web hosting
- Chatbots with acceptable use policies prohibiting discriminatory content

**Important**: These exclusions only apply if the technology is **not** used for consequential decisions. If any of these technologies are repurposed or used as a substantial factor in consequential decisions, they become high-risk.

## What "Not Regulated" Means

Systems that are not regulated as high-risk under the Colorado AI Act:

### Are NOT Subject To:
- Developer obligations under § 6-1-1702 (documentation, testing, risk management)
- Deployer obligations under § 6-1-1703 (impact assessments, risk management policies)
- Specific high-risk system disclosure requirements

### MAY Still Be Subject To:
- **General AI disclosure requirements** (§ 6-1-1704(1)): If the system interacts with consumers, you must disclose that consumers are interacting with an AI system (unless it would be obvious)
- **General anti-discrimination laws**: All applicable Colorado and federal civil rights laws still apply
- **Consumer protection laws**: General consumer protection requirements remain in effect
- **Other applicable regulations**: Industry-specific regulations, data privacy laws, etc.

## Risk of Reclassification

An AI system that is currently "not regulated" can become high-risk if:

1. **Use case changes**: The system begins to be used for consequential decisions
2. **Integration changes**: The system becomes integrated into a consequential decision-making process
3. **Capability expansion**: The system is modified to have a substantial impact on consequential decisions

**Best Practice**: Regularly reassess AI systems to determine if changes in use, context, or capabilities have made them high-risk.

## Compliance Steps

If your AI system is not regulated as high-risk:

1. **Document the determination**: Record why the system is not high-risk
2. **Monitor for changes**: Establish a process to detect if the system's use evolves toward consequential decisions
3. **Comply with general requirements**: Ensure compliance with disclosure requirements if the system interacts with consumers
4. **Follow other applicable laws**: Continue to comply with all other relevant regulations

## Related Provisions

- § 6-1-1701(9) — Definition of high-risk artificial intelligence system and exclusions
- § 6-1-1701(3) — Definition of consequential decision
- § 6-1-1701(15) — Definition of substantial factor
- § 6-1-1704(1) — General disclosure requirement (may still apply)

