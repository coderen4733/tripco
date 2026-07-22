from fastapi import APIRouter

from apps.organization.department.router import dept_router
from apps.organization.duty.router import duty_router
from apps.organization.employment_type.router import emp_type_router
from apps.organization.position.router import position_router
from apps.organization.team.router import team_router
from apps.organization.title.router import title_router

api_router = APIRouter()

# 1. 마스터컬렉션
# 1-1. 부서(Department)
api_router.include_router(
    dept_router,
    prefix="/organizations/departments",
    tags=["Mst Department 부서"],
)
# 1-2. 팀(Team)
api_router.include_router(
    team_router, prefix="/organizations/teams", tags=["Mst Team 팀"]
)
# 1-3. 직급/직위(Position)
api_router.include_router(
    position_router,
    prefix="/organizations/positions",
    tags=["Mst Position 직급/직위"],
)
# 1-4. 직책(Title)
api_router.include_router(
    title_router,
    prefix="/organizations/titles",
    tags=["Mst Title 직책"],
)
# 1-5. 직무(Duty)
api_router.include_router(
    duty_router,
    prefix="/organizations/duties",
    tags=["Mst Duty 직무"],
)
# 1-6. 고용형태(EmploymentType)
api_router.include_router(
    emp_type_router,
    prefix="/organizations/employment_types",
    tags=["Mst EmploymentType 고용형태"],
)
