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
        DU--> DH[Direktur Human Capital]
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
            GMCS[Cargo Service]
            CGSL[[Sales]]
            CI[[Cargo Improvement]]
            RA[[Regulated Agent]]
            GMCO[Cargo Operation]
            KNO[[Regional Station KNO]]
            CGK[[Regional Station CGK]]
            DPS[[Regional Station DPS]]
            UPG[[Regional Station UPG]]
        end
        subgraph LOGG[ ]
            GMAE[Air Express]
            AESL[[Sales]]
            AEOP[[Operation]]
            AEPC[[Route Developemt]]
            GMFF[Freight Forwarder]
            FFSL[[Sales]]
            FFOP[[Operation]]
            FFPC[[Project Control]]
            GMBSS[Baggage Service Solutions]
            BSSSL[[Sales]]
            BSSOP[[Operation]]
            GMCL[Contract Logistics]
            CLSL[[Sales]]
            CLOP[[Operation]]
            CLDS[[Design & Solution]]
        end
        subgraph CBEG[ ]
            PQ[[Policy and QHSE]]
            KS[[Key Account and Solutions]]
            BIP[[Business Intelligence and Performance]]
            PO[[Procurement Outbound]]
        end
        subgraph CLSG[ ]
            SAF[[Accounting & Finance]]
            SHL[[HC and Legal]]
            SFS[[Facility and System]]
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
            CDBD[[Business Development]]
            CDCP[[Commercial Partnership]]
            SSM[Startegic Sales & Marketing]
            SMMC[[Marketing Communication]]
            SMIS[[Integrated Sales]]
            BPS[Business Performance and Startegy]
            BPPS[[Performance & Strategy]]
            BPAM[[Account Management]]
        end
        subgraph DDO[ ]
            direction LR
            OPS[Operation Excellence & Standarization]
            OPOS[[Operation & Standarization]]
            OPQA[[Quality Assurance]]
            OPHSE[[HSSE]]
            CX[Customer Experience]
            CXPP[[Customer Experience Planning & Policy]]
            CXD[[Customer Experience Delivery]]
            CXIC[[Customer Experience Insight & CRM]]
            BP[Business Portfolio]
            BPT[[Business Portfolio Transformation]]
            BPMO[[Business Portfolio Model Optimization]]
            SAS([SDU: Aviataion Service])
            SFM([SDU: Facility Management & Manpower Service])
            SHO([SDU: Hospitality])
        end
        subgraph DDK[ ]
            direction LR
            CF[Corporate Finance]
            CFM[[Capital Management]]
            CFF[[Capital Financing]]
            CFT[[Treasury]]
            SPM[Startegic Performance Management]
            CFSF[[Startegy & Finance analysis]]
            CFPC[[Performance & Cost analysis]]
            CFSP[[Subsidiary Performance Management]]
            ACC[Accounting]
            CFAT[[Accounting & Tax]]
            CFFR[[Financial Reporting]]
            SAM([SDU: Assets Management])
            SERP([SDU: ERP])
        end
        subgraph DDH[ ]
            direction LR
            HS[HC Strategy and Planning]
            HCOC[[Organization & Culture]]
            HCPPE[[Planning Policy & Evaluation]]
            HB[HC BP and Talent]
            HCBP[[HC Business Partner]]
            HCTD[[HC Talent & Development]]
            HG[HC Service and GA]
            HCS[[HC Services]]
            HCI[[HC Industrial & Employee Relation]]
            HCGA[[General Affairs & Facility]]
            IT[Information Technology]
            ITSI[[IT Strategy & Integration]]
            ITDV[[IT Development]]
            ITDV[[IT Operation & Infrastructure]]
            ITCG[[IT Cyberecurity Governance & Control]]
            SACA([SDU: IAS Academy])
        end
        subgraph DDR[ ]
            direction LR
            RM[Risk Management, Governance and Compliance]
            RMCG[[Corporate Governance & Policy]]
            RMCA[[Compliance & Assurance]]
            RMSD[[Risk Strategy & Development]]
            RMAM[[Risk Assexment & Monitoring]]
            LG[Legal]
            CLG[[Corporate Legal]]
            BLG[[Business Legal]]
            LGA[[Legal Aid]]
            PC[Procurement]
            PCP[[Procurement Planning]]
            PCOV[[Procurement Operation & Vendor]]
        end
        subgraph DDB[ ]
            direction LR
            IA[Internal Audit]
            BOA[[Business & Operation Audit]]
            FEA[[Finance & Enabler Audit]]
            CS[Corporate Secretary]
            BSCA[[Board Support & Corporate Adm]]
            CCSR[[Corp Comm & Stakeholder Relation]]
            CORSUS[[Corporate Sustainability]]
            CST[Corporate Strategy]
            CPD[[Corporate Planning & Development]]
            CORT[[Corporate Transformation]]
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
    class DDB,DDK,DDC,DDO,DDR,DDH,CSG,LOGG,CBEG,CLSG nofill
    
    class DU,DC,DK,DO,DR,DH s-teal
    class SPMO,SACA,SAM,SERP,SAS,SFM,SHO s-green
    class SEGM s-blue
    class IA,CS,CST,PC,LG,RM,HS,HG,HB,IT,CF,SPM,ACC,OPS,CX,BP,CD,SSM,BPS,SCS,LOG,CBE,CLS,GMCS,GMCO,GMAE,GMFF,GMBSS,GMCL s-yellow

    classDef nostroke stroke:transparent
    classDef nofill fill:transparent
    classDef s-teal fill:#339999 
    classDef s-blue fill:#00a1f1 
    classDef s-green fill:#34A853
    classDef s-yellow fill:#FBBC05,color:#000
    classDef s-red fill:#F14F21,color:#000
```


Notes:
- DIR,DDK,DDC,DDO,DDR,DDH,CSG,LOGG,CBEG,CLSG: are just grouping not actual Unit Kerja
- band 1 ( head of a unit that is 1 level Under Director): presented by nodes with yellow,blue,green background color
- band 2 ( head of a unit that is 1 level Under band 1): presented by subprocess nodes
- SDU: Strategic Delivery Unit doesnt have band 2


## Branch Offices by Region
```mermaid
flowchart LR
subgraph R1[Regional 1]
    direction TB
    KNO
    DTB
    PKU
    PLM
    DJB
    PDG
    BKS
    BTH
    TNJ
    PGK
    TJQ
    BTJ
    TKG
end
subgraph R2[Regional 2]
    direction TB
    CGK
    BPN
    BDJ
    PNK
    PKY
    HLP
    KJT
end
subgraph R3[Regional 3]
    direction TB
    DPS
    BWX
    SUB
    YIA
    SRG
    LOP
    SOC
    KOE
end
subgraph R4[Regional 4]
    direction TB
    UPG
    DJJ
    BIK
    MDC
    GTO
    AMQ
    KDI
end
IAS --> R1
IAS --> R2
IAS --> R3
IAS --> R4
```

