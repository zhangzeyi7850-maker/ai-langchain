```plain text
START → draftEmail → waitForApproval（interrupt 暂停）
                          ↓ Command({ resume })
              ┌── 'approved' ──→ sendEmail   → END
              ├── 'rejected' ──→ cancelEmail → END
              └── { action:'modify', feedback:'' } ──→ draftEmail（重新起草，循环）
```
