from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.social import Comment
from app.models.auction import Auction
from app.schemas.social import CommentCreate, CommentResponse
from app.dependencies import get_current_user

router = APIRouter(prefix='/auctions', tags=['Comments'])


@router.post('/{auction_id}/comments', response_model=CommentResponse, status_code=201)
async def post_comment(
    auction_id: int,
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    auction = await db.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status.HTTP_404_NOT_FOUND, 'Auction not found')

    if data.parent_comment_id:
        parent = await db.get(Comment, data.parent_comment_id)
        if not parent or parent.auction_id != auction_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, 'Parent comment not found')

    comment = Comment(
        auction_id=auction_id,
        user_id=current_user.id,
        comment_text=data.comment_text,
        parent_comment_id=data.parent_comment_id
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


@router.get('/{auction_id}/comments', response_model=List[CommentResponse])
async def get_comments(auction_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Comment)
        .where(Comment.auction_id == auction_id)
        .order_by(Comment.created_at.asc())
    )
    comments = result.scalars().all()
    
    # Simple serialization without nested queries
    return [
        {
            'id': c.id,
            'auction_id': c.auction_id,
            'user_id': c.user_id,
            'comment_text': c.comment_text,
            'parent_comment_id': c.parent_comment_id,
            'created_at': c.created_at,
        }
        for c in comments
    ]


@router.delete('/{auction_id}/comments/{comment_id}', status_code=204)
async def delete_comment(
    auction_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    comment = await db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, 'Comment not found')
    if comment.auction_id != auction_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, 'Comment not found')
    if comment.user_id != current_user.id and current_user.role != 'admin':
        raise HTTPException(status.HTTP_403_FORBIDDEN, 'Not authorized')
    await db.delete(comment)