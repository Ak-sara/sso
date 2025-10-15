# 🌐 Sample Organization Structures

## IAS Parent, Siblings, and Subsidiaries
```mermaid
flowchart TD
    INJ[Injourney] --> IAS
    INJ --> TWC[Taman Wisata Candi]
    INJ --> ITDC[Tourism Destination]
    INJ --> HIN[Hotel Indonesia Natour]
    INJ --> IR[Sarinah]
    INJ --> API[Angkasa Pura Indonesia]
    IAS[Injourney Aviation Service] --> IASS[IAS Support]
    IAS --> IASG[IAS Ground Handling]
    IAS --> IASP[IAS Property]
    IAS --> IASH[IAS Hospitality]
```


## IAS Internal Structure
```mermaid
flowchart TD
    subgraph BOD
        direction TB
        DU[Direktur Utama] --> DC[Direktur Komersial]
        DU --> DO[Direktur Operasi]
        DU--> DR[Direktur Resiko]
        DU --> DK[Direktur Keuangan]
        DU--> DH[Direktur SDM]
    end
    DU --> DDB
    BOD --> SBUCL
    DC -.-> SBUCL

    subgraph DIR[ ]
    subgraph SBUCL[SBU Cargo & Logistics]
        SEGM[Cargo & Logistics]
        SEGM --> SCS[Cargo Service]
        SEGM --> LOG[Logistics]
        SEGM --> CBE[Commercial & Business Excellence]
        SEGM --> CLS[Cargo & Logistics Supports]
        subgraph CSG[ ]
            GMCS[[Cargo Service]]
            CGSL(Sales)
            CI(Cargo Improvement)
            RA(Regulated Agent)
            GMCO[[Cargo Operation]]
            KNO(Regional Station KNO)
            CGK(Regional Station CGK)
            DPS(Regional Station DPS)
            UPG(Regional Station UPG)
        end
        subgraph LOGG[ ]
            AE[[Air Express]]
            FF[[Freight Forwarder]]
            BSS[[Baggage Service Solutions]]
            CL[[Contract Logistics]]
        end
        subgraph CBEG[ ]
            PQ(Policy and QHSE)
            KS(Key Account and Solutions)
            BIP(Business Intelligence and Performance)
            PO(Procurement Outbound)
        end
        subgraph CLSG[ ]
            SAF(Accounting & Finance)
            SHL(HC and Legal)
            SFS(Facility and System)
        end
        class SBUCL,CBEG,CSG,LOGG nofill;
        CBE ~~~ CBEG
        SCS ~~~ CSG
        LOG ~~~ LOGG
        CLS ~~~ CLSG
    end
        subgraph DDC[ ]
            direction LR
            CD[Commercial Development]
            SSM[Startegic Sales Marketing]
            BPS[Business Performance and Startegy]
        end
        subgraph DDO[ ]
            direction LR
            OPS[Operation Excellence & Standarization]
            CX[Customer Experience]
            BP[Business Portfolio]
            SAS([SDU: Aviataion Service])
            SFM([SDU: Facility Management & Manpower Service])
            SHO([SDU: Hospitality])
        end
        subgraph DDK[ ]
            direction LR
            CF[Corporate Finance]
            SPM[Startegic Performance Management]
            ACC[Accounting]
            SAM([SDU: Assets Management])
            SERP([SDU: ERP])
        end
        subgraph DDH[ ]
            direction LR
            HS[HC Strategy and Planning]
            HB[HC BP and Talent]
            HG[HC Service and GA]
            IT[Information Technology]
            SACA([SDU: IAS Academy])
        end
        subgraph DDR[ ]
            direction LR
            RM[Risk Management, Governance and Compliance]
            LG[Legal]
            PC[Procurement]
        end
        subgraph DDB[ ]
            direction LR
            IA[Internal Audit]
            CS[Corporate Secretary]
            CST[Corporate Strategy]
            SPMO([SDU PMO])
        end
    end

    DK --> DDK
    DC --> DDC
    DO --> DDO
    DR --> DDR
    DH --> DDH
    class DIR nostroke
    class DIR nofill
    class BOD nofill
    classDef nostroke stroke:transparent
    classDef nofill fill:transparent
```

Notes:
- DIR,DDK,DDC,DDO,DDR,DDH,CSG,LOGG,CBEG,CLSG: are just grouping not actual Unit Kerja
- IA, DDB, CD, OPS: is example of band 1 ( 1 level Under Director)



## Branch Offices by Region
```mermaid
flowchart TD
subgraph R1[Regional 1]
    direction LR
    KNO
    PLM
end
subgraph R2[Regional 2]
    direction LR
    CGK
    BPN
end
subgraph R3[Regional 3]
    direction LR
    DPS
    SUB
end
subgraph R4[Regional 4]
    direction LR
    UPG
    MDC
    AMQ
end
IAS --> R1
IAS --> R2
IAS --> R3
IAS --> R4
```